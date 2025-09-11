"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminPoints = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
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
