import { Router } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { onServiceRequested } from "../services/services";

export const pointServices = Router();
pointServices.use(requireAuth, requireRole("GTC_POINT"));

async function myPointId(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u?.gtcPointId) {
    const err: any = new Error("User is not attached to a GTC Point");
    err.status = 409;
    throw err;
  }
  return u.gtcPointId;
}

/** GET /api/point/services → my point’s services (with Service details) */
pointServices.get("/", async (req, res) => {
  let pointId: string;
  try {
    pointId = await myPointId(req.user!.id);
  } catch (e: any) {
    return res.status(e.status ?? 500).json({ error: e.message ?? "Error" });
  }
  const items = await prisma.gtcPointService.findMany({
    where: { gtcPointId: pointId },
    include: { service: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ items });
});

/** POST /api/point/services/requests → set PENDING_REQUEST (by id or code) */
const requestSchema = z
  .object({
    serviceId: z.string().min(1).optional(),
    serviceCode: z.string().regex(/^[A-Z0-9_]+$/).optional(),
  })
  .refine((d) => d.serviceId || d.serviceCode, { message: "serviceId or serviceCode required" });

pointServices.post("/requests", async (req, res) => {
  let pointId: string;
  try {
    pointId = await myPointId(req.user!.id);
  } catch (e: any) {
    return res.status(e.status ?? 500).json({ error: e.message ?? "Error" });
  }

  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });

  const svc = parsed.data.serviceId
    ? await prisma.service.findUnique({ where: { id: parsed.data.serviceId } })
    : await prisma.service.findUnique({ where: { code: parsed.data.serviceCode! } });
  if (!svc || !svc.active) return res.status(404).json({ error: "Service not found or inactive" });

  // Ensure the service belongs to the same sector as the point
  const point = await prisma.gtcPoint.findUnique({ where: { id: pointId } });
  if (!point) return res.status(404).json({ error: "Point not found" });
  if (point.sectorId !== svc.sectorId) return res.status(403).json({ error: "Service does not belong to this point's sector" });

  const existing = await prisma.gtcPointService.findUnique({
    where: { gtcPointId_serviceId: { gtcPointId: pointId, serviceId: svc.id } },
  });
  if (existing?.status === "ENABLED") {
    return res.status(409).json({ error: "Service already enabled for this point" });
  }

  const link = await prisma.gtcPointService.upsert({
    where: { gtcPointId_serviceId: { gtcPointId: pointId, serviceId: svc.id } },
    update: { status: "PENDING_REQUEST" },
    create: { gtcPointId: pointId, serviceId: svc.id, status: "PENDING_REQUEST" },
  });

  await onServiceRequested(pointId, svc.id);

  res.status(201).json(link);
});
