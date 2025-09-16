"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meLeads = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
exports.meLeads = (0, express_1.Router)();
exports.meLeads.use(auth_1.requireAuth, (0, auth_1.requireRole)("SECTOR_OWNER", "GTC_POINT"));
/** GET /api/me/leads?page=&pageSize= */
exports.meLeads.get("/", async (req, res) => {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
    // Resolve my sectorId (owner.sectorId OR point.sectorId)
    let sectorId = null;
    if (req.user.role === "SECTOR_OWNER") {
        const me = await prisma_1.prisma.user.findUnique({ where: { id: req.user.id }, select: { sectorId: true } });
        sectorId = me?.sectorId ?? null;
    }
    else if (req.user.role === "GTC_POINT") {
        const me = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            include: { gtcPoint: true },
        });
        sectorId = me?.gtcPoint?.sectorId ?? null;
    }
    if (!sectorId)
        return res.status(409).json({ error: "User is not attached to a sector" });
    const [items, total] = await Promise.all([
        prisma_1.prisma.lead.findMany({
            where: { sectorId },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: { attachments: true },
        }),
        prisma_1.prisma.lead.count({ where: { sectorId } }),
    ]);
    res.json({ items, total, page, pageSize });
});
