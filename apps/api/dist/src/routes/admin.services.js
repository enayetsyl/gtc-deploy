"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminServices = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
exports.adminServices = (0, express_1.Router)();
exports.adminServices.use(auth_1.requireAuth, (0, auth_1.requireRole)("ADMIN"));
exports.adminServices.get("/", async (req, res) => {
    const items = await prisma_1.prisma.service.findMany({ orderBy: { createdAt: "desc" } });
    res.json(items);
});
const createSchema = zod_1.z.object({
    code: zod_1.z.string().min(2).max(50).regex(/^[A-Z0-9_]+$/),
    name: zod_1.z.string().min(2).max(200),
    active: zod_1.z.boolean().optional().default(true),
});
exports.adminServices.post("/", async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
    const service = await prisma_1.prisma.service.create({ data: parsed.data });
    res.status(201).json(service);
});
const idParam = zod_1.z.object({ id: zod_1.z.string().min(1) });
const updateSchema = zod_1.z.object({
    code: zod_1.z.string().min(2).max(50).regex(/^[A-Z0-9_]+$/).optional(),
    name: zod_1.z.string().min(2).max(200).optional(),
    active: zod_1.z.boolean().optional(),
});
exports.adminServices.get("/:id", async (req, res) => {
    const { id } = idParam.parse(req.params);
    const service = await prisma_1.prisma.service.findUnique({ where: { id } });
    if (!service)
        return res.status(404).json({ error: "Not found" });
    res.json(service);
});
exports.adminServices.patch("/:id", async (req, res) => {
    const { id } = idParam.parse(req.params);
    const body = updateSchema.safeParse(req.body);
    if (!body.success)
        return res.status(400).json({ error: "ValidationError", issues: body.error.issues });
    const service = await prisma_1.prisma.service.update({ where: { id }, data: body.data });
    res.json(service);
});
exports.adminServices.delete("/:id", async (req, res) => {
    const { id } = idParam.parse(req.params);
    const links = await prisma_1.prisma.gtcPointService.count({ where: { serviceId: id } });
    if (links > 0)
        return res.status(409).json({ error: "Service is linked to points; unlink first." });
    await prisma_1.prisma.service.delete({ where: { id } });
    res.json({ ok: true });
});
