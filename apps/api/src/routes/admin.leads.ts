import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { z } from "zod";

export const adminLeads = Router();
adminLeads.use(requireAuth, requireRole("ADMIN"));

/** GET /api/admin/leads?sectorId=&page=&pageSize= */
adminLeads.get("/", async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
  const sectorId = (req.query.sectorId as string | undefined) || undefined;

  const where = sectorId ? { sectorId } : {};

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { sector: true, attachments: true },
    }),
    prisma.lead.count({ where }),
  ]);

  res.json({ items, total, page, pageSize });
});
