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
// Create a sector owner (ADMIN only)
// Accept either a single sectorId (backwards compat) or an array of sectorIds for multi-select
const createOwnerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(120),
    email: zod_1.z.string().email(),
    sectorId: zod_1.z.string().min(1).optional(),
    sectorIds: zod_1.z.array(zod_1.z.string().min(1)).optional(),
    sendInvite: zod_1.z.boolean().optional().default(true),
});
// -------- Sector Owners: list & update (edit + assign/remove sectors) --------
// Paged list of sector owners with their sector memberships
exports.adminSectors.get("/sector-owners", async (req, res) => {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
    const [items, total] = await Promise.all([
        prisma_1.prisma.user.findMany({
            where: { role: "SECTOR_OWNER" },
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { createdAt: "desc" },
            include: { userSectors: { include: { sector: true } } },
        }),
        prisma_1.prisma.user.count({ where: { role: "SECTOR_OWNER" } }),
    ]);
    const shaped = items.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        sectorId: u.sectorId, // primary sector
        createdAt: u.createdAt,
        sectors: u.userSectors.map((us) => us.sector),
    }));
    res.json({ items: shaped, total, page, pageSize });
});
exports.adminSectors.post("/sector-owners", async (req, res) => {
    const parsed = createOwnerSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
    const { name, email, sectorId, sectorIds, sendInvite } = parsed.data;
    // Normalize sectorIds: prefer sectorIds array, fall back to sectorId string
    const resolvedSectorIds = Array.isArray(sectorIds) && sectorIds.length > 0 ? sectorIds : sectorId ? [sectorId] : [];
    if (resolvedSectorIds.length === 0)
        return res.status(400).json({ error: "No sector specified" });
    // ensure all sectors exist
    const found = await prisma_1.prisma.sector.findMany({ where: { id: { in: resolvedSectorIds } } });
    if (found.length !== resolvedSectorIds.length)
        return res.status(404).json({ error: "One or more sectors not found" });
    // unique email
    const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (existing)
        return res.status(409).json({ error: "Email already in use" });
    // If no invite, require a server-generated temp password (we'll set a random hash anyway)
    // For invite flow, set a random hash now; they'll change it upon invite acceptance
    const tempHash = await argon2_1.default.hash("temp:" + Math.random().toString(36).slice(2));
    // Create user with the first sector as the primary sectorId (keeps schema-compatible)
    const primarySectorId = resolvedSectorIds[0];
    const user = await prisma_1.prisma.user.create({
        data: {
            name,
            email,
            passwordHash: tempHash,
            role: "SECTOR_OWNER",
            sectorId: primarySectorId,
        },
        select: { id: true, name: true, email: true, role: true, sectorId: true, createdAt: true },
    });
    // Persist many-to-many links in UserSector for all selected sectors
    try {
        await prisma_1.prisma.userSector.createMany({
            data: resolvedSectorIds.map((sid) => ({ userId: user.id, sectorId: sid })),
            skipDuplicates: true,
        });
    }
    catch (err) {
        // Log but don't fail the request for now
        console.warn("Failed to create user-sector links:", err);
    }
    if (sendInvite) {
        const { token } = await (0, jwt_1.signInviteToken)(user.id);
        const primarySector = found.find((s) => s.id === primarySectorId);
        const link = `${env_1.env.webBaseUrl.replace(/\/$/, "")}/invite/accept?token=${encodeURIComponent(token)}`;
        await (0, email_1.enqueueEmail)({
            to: user.email,
            subject: "You're invited as Sector Owner",
            html: `<p>Hello ${user.name},</p><p>You've been added as a Sector Owner for <strong>${primarySector?.name ?? "your sector(s)"}</strong>. To activate your account and set your password, click: <a href="${link}">${link}</a></p>`,
        });
    }
    // NOTE: multi-sector membership is not persisted beyond primary sector without a DB migration.
    // We only set the user's primary `sectorId` to preserve compatibility. To fully support
    // many-to-many sector ownership, we should add a join table (e.g. UserSector) in Prisma
    // and migrate the database. If you want that, I can prepare the migration in a follow-up.
    res.status(201).json(user);
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
const updateOwnerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(120).optional(),
    email: zod_1.z.string().email().optional(),
    sectorIds: zod_1.z.array(zod_1.z.string().min(1)).min(1, "At least one sector required").optional(),
});
/**
 * PATCH /api/admin/sectors/sector-owners/:id
 * Body: { name?, email?, sectorIds?[] }
 * - If sectorIds provided: replace full membership (ensuring at least one) and set primary sectorId to first element
 */
exports.adminSectors.patch("/sector-owners/:id", async (req, res) => {
    const { id } = idParam.parse({ id: req.params.id });
    const parsed = updateOwnerSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
    const body = parsed.data;
    const existing = await prisma_1.prisma.user.findUnique({ where: { id } });
    if (!existing || existing.role !== "SECTOR_OWNER")
        return res.status(404).json({ error: "Not found" });
    // Handle email uniqueness if changed
    if (body.email && body.email !== existing.email) {
        const dup = await prisma_1.prisma.user.findUnique({ where: { email: body.email } });
        if (dup)
            return res.status(409).json({ error: "Email already in use" });
    }
    // If sectorIds provided, validate and sync membership inside a transaction
    let updatedUser;
    if (body.sectorIds && body.sectorIds.length) {
        const sectorIds = Array.from(new Set(body.sectorIds));
        const found = await prisma_1.prisma.sector.findMany({ where: { id: { in: sectorIds } } });
        if (found.length !== sectorIds.length)
            return res.status(404).json({ error: "One or more sectors not found" });
        updatedUser = await prisma_1.prisma.$transaction(async (tx) => {
            // Update primary sector on user (first in array) + name/email if provided
            const u = await tx.user.update({
                where: { id },
                data: {
                    name: body.name ?? undefined,
                    email: body.email ?? undefined,
                    sectorId: sectorIds[0],
                },
            });
            // Remove memberships not in the new list
            await tx.userSector.deleteMany({ where: { userId: id, sectorId: { notIn: sectorIds } } });
            // Upsert each membership
            for (const sid of sectorIds) {
                await tx.userSector.upsert({
                    where: { userId_sectorId: { userId: id, sectorId: sid } },
                    update: {},
                    create: { userId: id, sectorId: sid },
                });
            }
            return u;
        });
    }
    else {
        // Only name/email changed
        updatedUser = await prisma_1.prisma.user.update({
            where: { id },
            data: {
                name: body.name ?? undefined,
                email: body.email ?? undefined,
            },
        });
    }
    // Reload with sectors
    const withSectors = await prisma_1.prisma.user.findUnique({
        where: { id: updatedUser.id },
        include: { userSectors: { include: { sector: true } } },
    });
    if (!withSectors)
        return res.status(500).json({ error: "ReloadFailed" });
    res.json({
        id: withSectors.id,
        name: withSectors.name,
        email: withSectors.email,
        role: withSectors.role,
        sectorId: withSectors.sectorId,
        createdAt: withSectors.createdAt,
        sectors: withSectors.userSectors.map((us) => us.sector),
    });
});
