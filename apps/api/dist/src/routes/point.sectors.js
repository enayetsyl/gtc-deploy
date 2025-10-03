"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pointSectors = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
exports.pointSectors = (0, express_1.Router)();
exports.pointSectors.use(auth_1.requireAuth, (0, auth_1.requireRole)("GTC_POINT"));
async function myPointId(userId) {
    const u = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!u?.gtcPointId) {
        const err = new Error("User is not attached to a GTC Point");
        err.status = 409;
        throw err;
    }
    return u.gtcPointId;
}
// GET /api/point/sectors -> list sectors the authenticated point belongs to
exports.pointSectors.get("/", async (req, res) => {
    let pointId;
    try {
        pointId = await myPointId(req.user.id);
    }
    catch (e) {
        return res.status(e.status ?? 500).json({ error: e.message ?? "Error" });
    }
    // Fetch sectors from join table and include the primary sector (if present)
    const links = await prisma_1.prisma.gtcPointSector.findMany({ where: { gtcPointId: pointId }, include: { sector: true } });
    const sectors = links.map((l) => ({ id: l.sector.id, name: l.sector.name }));
    // If a primary sector exists on the point but it's not in the join table, include it
    const point = await prisma_1.prisma.gtcPoint.findUnique({ where: { id: pointId }, select: { sectorId: true } });
    if (point?.sectorId && !sectors.find((s) => s.id === point.sectorId)) {
        const primary = await prisma_1.prisma.sector.findUnique({ where: { id: point.sectorId }, select: { id: true, name: true } });
        if (primary)
            sectors.unshift(primary);
    }
    res.json({ items: sectors });
});
