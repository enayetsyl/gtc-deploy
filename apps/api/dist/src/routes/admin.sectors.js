"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminSectors = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const argon2_1 = __importDefault(require("argon2"));
const email_1 = require("../queues/email");
const jwt_1 = require("../lib/jwt");
const env_1 = require("../config/env");
exports.adminSectors = (0, express_1.Router)();
exports.adminSectors.use(auth_1.requireAuth, (0, auth_1.requireRole)("ADMIN"));
// list with basic pagination
exports.adminSectors.get("/", async (req, res) => {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
    const [items, total] = await Promise.all([
        prisma_1.prisma.sector.findMany({
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { createdAt: "desc" },
        }),
        prisma_1.prisma.sector.count(),
    ]);
    res.json({ items, total, page, pageSize });
});
const createSchema = zod_1.z.object({ name: zod_1.z.string().min(2).max(100) });
exports.adminSectors.post("/", async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
    const sector = await prisma_1.prisma.sector.create({ data: parsed.data });
    res.status(201).json(sector);
});
const idParam = zod_1.z.object({ id: zod_1.z.string().min(1) });
const updateSchema = zod_1.z.object({ name: zod_1.z.string().min(2).max(100) });
exports.adminSectors.get("/:id", async (req, res) => {
    const { id } = idParam.parse(req.params);
    const sector = await prisma_1.prisma.sector.findUnique({ where: { id } });
    if (!sector)
        return res.status(404).json({ error: "Not found" });
    res.json(sector);
});
exports.adminSectors.patch("/:id", async (req, res) => {
    const { id } = idParam.parse(req.params);
    const body = updateSchema.safeParse(req.body);
    if (!body.success)
        return res.status(400).json({ error: "ValidationError", issues: body.error.issues });
    const sector = await prisma_1.prisma.sector.update({ where: { id }, data: body.data });
    res.json(sector);
});
exports.adminSectors.delete("/:id", async (req, res) => {
    const { id } = idParam.parse(req.params);
    // optional safety: prevent delete if points exist
    const count = await prisma_1.prisma.gtcPoint.count({ where: { sectorId: id } });
    if (count > 0)
        return res.status(409).json({ error: "Sector has points; move or delete them first." });
    await prisma_1.prisma.sector.delete({ where: { id } });
    res.json({ ok: true });
});
// Create a sector owner (ADMIN only)
const createOwnerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(120),
    email: zod_1.z.string().email(),
    sectorId: zod_1.z.string().min(1),
    sendInvite: zod_1.z.boolean().optional().default(true),
});
exports.adminSectors.post("/sector-owners", async (req, res) => {
    const parsed = createOwnerSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
    const { name, email, sectorId, sendInvite } = parsed.data;
    // ensure sector exists
    const sector = await prisma_1.prisma.sector.findUnique({ where: { id: sectorId } });
    if (!sector)
        return res.status(404).json({ error: "Sector not found" });
    // unique email
    const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (existing)
        return res.status(409).json({ error: "Email already in use" });
    // If no invite, require a server-generated temp password (we'll set a random hash anyway)
    // For invite flow, set a random hash now; they'll change it upon invite acceptance
    const tempHash = await argon2_1.default.hash("temp:" + Math.random().toString(36).slice(2));
    const user = await prisma_1.prisma.user.create({
        data: {
            name,
            email,
            passwordHash: tempHash,
            role: "SECTOR_OWNER",
            sectorId,
        },
        select: { id: true, name: true, email: true, role: true, sectorId: true, createdAt: true },
    });
    if (sendInvite) {
        const { token } = await (0, jwt_1.signInviteToken)(user.id);
        const link = `${env_1.env.webBaseUrl.replace(/\/$/, "")}/auth/invite/accept?token=${encodeURIComponent(token)}`;
        await (0, email_1.enqueueEmail)({
            to: user.email,
            subject: "You're invited as Sector Owner",
            html: `<p>Hello ${user.name},</p><p>You've been added as a Sector Owner for <strong>${sector.name}</strong>. To activate your account and set your password, click: <a href="${link}">${link}</a></p>`,
        });
    }
    res.status(201).json(user);
});
