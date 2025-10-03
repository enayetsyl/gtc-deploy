import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { onServiceStatusChanged } from "../services/services";

export const adminPoints = Router();
adminPoints.use(requireAuth);

adminPoints.get("/", requireRole("ADMIN"), async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
  const [items, total] = await Promise.all([
    prisma.gtcPoint.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { sector: true },
    }),
    prisma.gtcPoint.count(),
  ]);
  res.json({ items, total, page, pageSize });
});

// Onboarding routes (moved from admin.points.onboarding.ts)
import { createOnboardingLink, approveOnboarding, declineOnboarding } from "../services/onboarding";

const onboardingCreateSchema = z.object({
  sectorId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(2),
  includeServices: z.boolean().default(false),
  serviceIds: z.array(z.string().min(1)).optional(),
});

// GET /api/admin/points/onboarding
adminPoints.get("/onboarding", requireRole("ADMIN"), async (req, res) => {
  const status = (req.query.status as string | undefined) ?? undefined;
  const where: any = {};
  if (status) where.status = status;
  const items = await prisma.pointOnboarding.findMany({ where, orderBy: { createdAt: "desc" }, include: { services: true, sector: true } });
  res.json({ items });
});

// POST /api/admin/points/onboarding
adminPoints.post("/onboarding", async (req, res) => {
  // Allow ADMIN or GTC_POINT to create onboarding requests
  const user = req.user!;
  if (user.role !== 'ADMIN' && user.role !== 'GTC_POINT') return res.status(403).json({ error: 'Forbidden' });

  const parsed = onboardingCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
  const ob = await createOnboardingLink(parsed.data);
  res.status(201).json(ob);
});

// POST /api/admin/points/onboarding/:id/approve
adminPoints.post("/onboarding/:id/approve", requireRole("ADMIN"), async (req, res) => {
  const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
  const result = await approveOnboarding(id, req.user!.id);
  res.json(result);
});

// POST /api/admin/points/onboarding/:id/decline
adminPoints.post("/onboarding/:id/decline", requireRole("ADMIN"), async (req, res) => {
  const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
  await declineOnboarding(id, req.user!.id);
  res.json({ ok: true });
});
const createSchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email(),
  sectorId: z.string().min(1),
});

adminPoints.post("/", requireRole("ADMIN"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
  const point = await prisma.gtcPoint.create({ data: parsed.data });
  res.status(201).json(point);
});

const idParam = z.object({ id: z.string().min(1) });
const updateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  email: z.string().email().optional(),
  sectorId: z.string().min(1).optional(),
});

adminPoints.get("/:id", requireRole("ADMIN"), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const point = await prisma.gtcPoint.findUnique({ where: { id }, include: { sector: true, services: true } });
  if (!point) return res.status(404).json({ error: "Not found" });
  res.json(point);
});

adminPoints.patch("/:id", requireRole("ADMIN"), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = updateSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "ValidationError", issues: body.error.issues });
  const point = await prisma.gtcPoint.update({ where: { id }, data: body.data });
  res.json(point);
});

adminPoints.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const svcCount = await prisma.gtcPointService.count({ where: { gtcPointId: id } });
  if (svcCount > 0) return res.status(409).json({ error: "Point has service links; remove them first." });
  await prisma.gtcPoint.delete({ where: { id } });
  res.json({ ok: true });
});

adminPoints.get("/:id/services", async (req, res) => {
  const { id } = idParam.parse(req.params);

  // allow ADMIN or allow SECTOR_OWNER when the point belongs to one of their sectors
  const user = req.user!;
  console.log('user', user)
  if (user.role !== 'ADMIN') {
    // must be a sector owner
    if (user.role !== 'SECTOR_OWNER') return res.status(403).json({ error: 'Forbidden' });

    // check point's sector
    const point = await prisma.gtcPoint.findUnique({ where: { id }, select: { sectorId: true } });
    if (!point) return res.status(404).json({ error: 'Not found' });

    const owns = await prisma.userSector.findFirst({ where: { userId: user.id, sectorId: point.sectorId } });
    if (!owns) return res.status(403).json({ error: 'Forbidden' });
  }

  const items = await prisma.gtcPointService.findMany({
    where: { gtcPointId: id },
    include: { service: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ items });
});
const svcActionSchema = z.object({ action: z.enum(["ENABLE", "DISABLE"]) });

/** PATCH /api/admin/points/:id/services/:serviceId  { action: "ENABLE"|"DISABLE" } */
adminPoints.patch("/:id/services/:serviceId", async (req, res) => {
  // allow ADMIN or SECTOR_OWNER (only for their sector)
  const user = req.user!;
  const { id } = idParam.parse(req.params);
  const serviceId = z.string().min(1).parse(req.params.serviceId);
  const body = svcActionSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "ValidationError", issues: body.error.issues });

  const svc = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!svc) return res.status(404).json({ error: "Service not found" });

  // If user is SECTOR_OWNER, ensure they own the point's sector
  if (user.role === 'SECTOR_OWNER') {
    const point = await prisma.gtcPoint.findUnique({ where: { id }, select: { sectorId: true } });
    if (!point) return res.status(404).json({ error: 'Point not found' });
    const owns = await prisma.userSector.findFirst({ where: { userId: user.id, sectorId: point.sectorId } });
    if (!owns) return res.status(403).json({ error: 'Forbidden' });
  } else if (user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Ensure point exists. If service and point sectors differ, allow the operation
  // but log a warning. Historically we blocked toggles across sectors which
  // prevented legitimate administrative actions; relax that constraint here.
  const pointForCheck = await prisma.gtcPoint.findUnique({ where: { id }, select: { sectorId: true } });
  if (!pointForCheck) return res.status(404).json({ error: 'Point not found' });
  if (pointForCheck.sectorId !== svc.sectorId) {
    // Keep authorization in place, but permit toggling even when sectors differ.
    console.warn(`Service ${serviceId} sector (${svc.sectorId}) differs from point ${id} sector (${pointForCheck.sectorId}). Proceeding with toggle as authorized user ${user.id}`);
  }

  const status = body.data.action === "ENABLE" ? "ENABLED" : "DISABLED";
  const link = await prisma.gtcPointService.upsert({
    where: { gtcPointId_serviceId: { gtcPointId: id, serviceId } },
    update: { status },
    create: { gtcPointId: id, serviceId, status },
  });

  await onServiceStatusChanged(id, serviceId, status as any);

  res.json(link);
});