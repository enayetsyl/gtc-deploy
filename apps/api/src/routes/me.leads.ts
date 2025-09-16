import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { z } from "zod";

export const meLeads = Router();
meLeads.use(requireAuth, requireRole("SECTOR_OWNER", "GTC_POINT"));

/** GET /api/me/leads?page=&pageSize= */
meLeads.get("/", async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));

  // Resolve my sectorId (owner.sectorId OR point.sectorId)
  let sectorId: string | null = null;

  if (req.user!.role === "SECTOR_OWNER") {
    const me = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { sectorId: true } });
    sectorId = me?.sectorId ?? null;
  } else if (req.user!.role === "GTC_POINT") {
    const me = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { gtcPoint: true },
    });
    sectorId = me?.gtcPoint?.sectorId ?? null;
  }

  if (!sectorId) return res.status(409).json({ error: "User is not attached to a sector" });

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where: { sectorId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { attachments: true },
    }),
    prisma.lead.count({ where: { sectorId } }),
  ]);

  res.json({ items, total, page, pageSize });
});
