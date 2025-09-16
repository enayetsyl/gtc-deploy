// apps/api/src/routes/sectors.public.ts
import { Router } from "express";
import { prisma } from "../lib/prisma";

export const sectorsPublic = Router();

/**
 * GET /api/sectors/public
 * Public, minimal list for dropdowns (no auth)
 * Response: [{ id, name }, ...] sorted by name
 */
sectorsPublic.get("/", async (_req, res) => {
  const items = await prisma.sector.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  res.json(items);
});
