"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminPoints = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const services_1 = require("../services/services");
exports.adminPoints = (0, express_1.Router)();
exports.adminPoints.use(auth_1.requireAuth, (0, auth_1.requireRole)("ADMIN"));
exports.adminPoints.get("/", async (req, res) => {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
    const [items, total] = await Promise.all([
        prisma_1.prisma.gtcPoint.findMany({
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { createdAt: "desc" },
            include: { sector: true },
        }),
        prisma_1.prisma.gtcPoint.count(),
    ]);
    res.json({ items, total, page, pageSize });
});
// Onboarding routes (moved from admin.points.onboarding.ts)
const onboarding_1 = require("../services/onboarding");
const onboardingCreateSchema = zod_1.z.object({
    sectorId: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    name: zod_1.z.string().min(2),
    includeServices: zod_1.z.boolean().default(false),
    serviceIds: zod_1.z.array(zod_1.z.string().min(1)).optional(),
});
// GET /api/admin/points/onboarding
exports.adminPoints.get("/onboarding", async (req, res) => {
    const status = req.query.status ?? undefined;
    const where = {};
    if (status)
        where.status = status;
    const items = await prisma_1.prisma.pointOnboarding.findMany({ where, orderBy: { createdAt: "desc" }, include: { services: true, sector: true } });
    res.json({ items });
});
// POST /api/admin/points/onboarding
exports.adminPoints.post("/onboarding", async (req, res) => {
    const parsed = onboardingCreateSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
    const ob = await (0, onboarding_1.createOnboardingLink)(parsed.data);
    res.status(201).json(ob);
});
// POST /api/admin/points/onboarding/:id/approve
exports.adminPoints.post("/onboarding/:id/approve", async (req, res) => {
    const { id } = zod_1.z.object({ id: zod_1.z.string().min(1) }).parse(req.params);
    const result = await (0, onboarding_1.approveOnboarding)(id, req.user.id);
    res.json(result);
});
// POST /api/admin/points/onboarding/:id/decline
exports.adminPoints.post("/onboarding/:id/decline", async (req, res) => {
    const { id } = zod_1.z.object({ id: zod_1.z.string().min(1) }).parse(req.params);
    await (0, onboarding_1.declineOnboarding)(id, req.user.id);
    res.json({ ok: true });
});
const createSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(200),
    email: zod_1.z.string().email(),
    sectorId: zod_1.z.string().min(1),
});
exports.adminPoints.post("/", async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
    const point = await prisma_1.prisma.gtcPoint.create({ data: parsed.data });
    res.status(201).json(point);
});
const idParam = zod_1.z.object({ id: zod_1.z.string().min(1) });
const updateSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(200).optional(),
    email: zod_1.z.string().email().optional(),
    sectorId: zod_1.z.string().min(1).optional(),
});
exports.adminPoints.get("/:id", async (req, res) => {
    const { id } = idParam.parse(req.params);
    const point = await prisma_1.prisma.gtcPoint.findUnique({ where: { id }, include: { sector: true, services: true } });
    if (!point)
        return res.status(404).json({ error: "Not found" });
    res.json(point);
});
exports.adminPoints.patch("/:id", async (req, res) => {
    const { id } = idParam.parse(req.params);
    const body = updateSchema.safeParse(req.body);
    if (!body.success)
        return res.status(400).json({ error: "ValidationError", issues: body.error.issues });
    const point = await prisma_1.prisma.gtcPoint.update({ where: { id }, data: body.data });
    res.json(point);
});
exports.adminPoints.delete("/:id", async (req, res) => {
    const { id } = idParam.parse(req.params);
    const svcCount = await prisma_1.prisma.gtcPointService.count({ where: { gtcPointId: id } });
    if (svcCount > 0)
        return res.status(409).json({ error: "Point has service links; remove them first." });
    await prisma_1.prisma.gtcPoint.delete({ where: { id } });
    res.json({ ok: true });
});
// list services for a point (optional helper)
exports.adminPoints.get("/:id/services", async (req, res) => {
    const { id } = idParam.parse(req.params);
    const items = await prisma_1.prisma.gtcPointService.findMany({
        where: { gtcPointId: id },
        include: { service: true },
        orderBy: { createdAt: "desc" },
    });
    res.json({ items });
});
const svcActionSchema = zod_1.z.object({ action: zod_1.z.enum(["ENABLE", "DISABLE"]) });
/** PATCH /api/admin/points/:id/services/:serviceId  { action: "ENABLE"|"DISABLE" } */
exports.adminPoints.patch("/:id/services/:serviceId", async (req, res) => {
    const { id } = idParam.parse(req.params);
    const serviceId = zod_1.z.string().min(1).parse(req.params.serviceId);
    const body = svcActionSchema.safeParse(req.body);
    if (!body.success)
        return res.status(400).json({ error: "ValidationError", issues: body.error.issues });
    const svc = await prisma_1.prisma.service.findUnique({ where: { id: serviceId } });
    if (!svc)
        return res.status(404).json({ error: "Service not found" });
    const status = body.data.action === "ENABLE" ? "ENABLED" : "DISABLED";
    const link = await prisma_1.prisma.gtcPointService.upsert({
        where: { gtcPointId_serviceId: { gtcPointId: id, serviceId } },
        update: { status },
        create: { gtcPointId: id, serviceId, status },
    });
    await (0, services_1.onServiceStatusChanged)(id, serviceId, status);
    res.json(link);
});
