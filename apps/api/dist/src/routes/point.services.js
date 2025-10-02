"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pointServices = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const services_1 = require("../services/services");
exports.pointServices = (0, express_1.Router)();
exports.pointServices.use(auth_1.requireAuth, (0, auth_1.requireRole)("GTC_POINT"));
async function myPointId(userId) {
    const u = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!u?.gtcPointId) {
        const err = new Error("User is not attached to a GTC Point");
        err.status = 409;
        throw err;
    }
    return u.gtcPointId;
}
/** GET /api/point/services → my point’s services (with Service details) */
exports.pointServices.get("/", async (req, res) => {
    let pointId;
    try {
        pointId = await myPointId(req.user.id);
    }
    catch (e) {
        return res.status(e.status ?? 500).json({ error: e.message ?? "Error" });
    }
    const items = await prisma_1.prisma.gtcPointService.findMany({
        where: { gtcPointId: pointId },
        include: { service: true },
        orderBy: { createdAt: "desc" },
    });
    res.json({ items });
});
/** POST /api/point/services/requests → set PENDING_REQUEST (by id or code) */
const requestSchema = zod_1.z
    .object({
    serviceId: zod_1.z.string().min(1).optional(),
    serviceCode: zod_1.z.string().regex(/^[A-Z0-9_]+$/).optional(),
})
    .refine((d) => d.serviceId || d.serviceCode, { message: "serviceId or serviceCode required" });
exports.pointServices.post("/requests", async (req, res) => {
    let pointId;
    try {
        pointId = await myPointId(req.user.id);
    }
    catch (e) {
        return res.status(e.status ?? 500).json({ error: e.message ?? "Error" });
    }
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
    const point = await prisma_1.prisma.gtcPoint.findUnique({ where: { id: pointId } });
    if (!point)
        return res.status(404).json({ error: "Point not found" });
    // Resolve service by id or by composite (sectorId + code) so codes are unique per sector
    const svc = parsed.data.serviceId
        ? await prisma_1.prisma.service.findUnique({ where: { id: parsed.data.serviceId } })
        : await prisma_1.prisma.service.findFirst({ where: { code: parsed.data.serviceCode, sectorId: point.sectorId } });
    if (!svc || !svc.active)
        return res.status(404).json({ error: "Service not found or inactive" });
    const existing = await prisma_1.prisma.gtcPointService.findUnique({
        where: { gtcPointId_serviceId: { gtcPointId: pointId, serviceId: svc.id } },
    });
    if (existing?.status === "ENABLED") {
        return res.status(409).json({ error: "Service already enabled for this point" });
    }
    const link = await prisma_1.prisma.gtcPointService.upsert({
        where: { gtcPointId_serviceId: { gtcPointId: pointId, serviceId: svc.id } },
        update: { status: "PENDING_REQUEST" },
        create: { gtcPointId: pointId, serviceId: svc.id, status: "PENDING_REQUEST" },
    });
    await (0, services_1.onServiceRequested)(pointId, svc.id);
    res.status(201).json(link);
});
