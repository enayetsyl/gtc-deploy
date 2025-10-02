import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

export const pointSectors = Router();
pointSectors.use(requireAuth, requireRole("GTC_POINT"));

async function myPointId(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u?.gtcPointId) {
    const err: any = new Error("User is not attached to a GTC Point");
    err.status = 409;
    throw err;
  }
  return u.gtcPointId;
}

// GET /api/point/sectors -> list sectors the authenticated point belongs to
pointSectors.get("/", async (req, res) => {
  let pointId: string;
  try {
    pointId = await myPointId(req.user!.id);
  } catch (e: any) {
    return res.status(e.status ?? 500).json({ error: e.message ?? "Error" });
  }

  // Fetch sectors from join table and include the primary sector (if present)
  const links = await prisma.gtcPointSector.findMany({ where: { gtcPointId: pointId }, include: { sector: true } });
  const sectors = links.map((l) => ({ id: l.sector.id, name: l.sector.name }));

  // If a primary sector exists on the point but it's not in the join table, include it
  const point = await prisma.gtcPoint.findUnique({ where: { id: pointId }, select: { sectorId: true } });
  if (point?.sectorId && !sectors.find((s) => s.id === point.sectorId)) {
    const primary = await prisma.sector.findUnique({ where: { id: point.sectorId }, select: { id: true, name: true } });
    if (primary) sectors.unshift(primary);
  }

  res.json({ items: sectors });
});
