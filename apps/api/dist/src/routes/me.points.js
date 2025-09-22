"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mePoints = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
exports.mePoints = (0, express_1.Router)();
exports.mePoints.use(auth_1.requireAuth, (0, auth_1.requireRole)("SECTOR_OWNER", "GTC_POINT"));
// GET /api/me/points?page=&pageSize=
exports.mePoints.get("/", async (req, res) => {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize ?? 50)));
    // Resolve my sector(s): for SECTOR_OWNER we read the join table UserSector; for GTC_POINT we use gtcPoint.sectorId
    let sectorIds = [];
    if (req.user.role === "SECTOR_OWNER") {
        try {
            const links = await prisma_1.prisma.userSector.findMany({ where: { userId: req.user.id }, select: { sectorId: true } });
            sectorIds = links.map((l) => l.sectorId);
            console.log('sector ids', sectorIds);
        }
        catch (err) {
            // fallback: use legacy sectorId on user
            const me = await prisma_1.prisma.user.findUnique({ where: { id: req.user.id }, select: { sectorId: true } });
            if (me?.sectorId)
                sectorIds = [me.sectorId];
        }
    }
    else if (req.user.role === "GTC_POINT") {
        const me = await prisma_1.prisma.user.findUnique({ where: { id: req.user.id }, include: { gtcPoint: true } });
        if (me?.gtcPoint?.sectorId)
            sectorIds = [me.gtcPoint.sectorId];
    }
    if (!sectorIds.length)
        return res.status(409).json({ error: "User is not attached to a sector" });
    const [items, total] = await Promise.all([
        prisma_1.prisma.gtcPoint.findMany({ where: { sectorId: { in: sectorIds } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
        prisma_1.prisma.gtcPoint.count({ where: { sectorId: { in: sectorIds } } }),
    ]);
    res.json({ items, total, page, pageSize });
});
exports.default = exports.mePoints;
