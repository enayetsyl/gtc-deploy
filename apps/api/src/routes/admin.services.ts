import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

export const adminServices = Router();
adminServices.use(requireAuth, requireRole("ADMIN"));

adminServices.get("/", async (req, res) => {
  // Optional filter: ?sectorId=...
  const sectorId = typeof req.query.sectorId === "string" ? req.query.sectorId : undefined;
  const where = sectorId ? { sectorId } : undefined;
  const items = await prisma.service.findMany({ where, orderBy: { createdAt: "desc" }, include: { sector: true } });
  res.json(items);
});

const createSchema = z.object({
  code: z.string().min(2).max(50).regex(/^[A-Z0-9_]+$/),
  name: z.string().min(2).max(200),
  sectorId: z.string().min(1),
  active: z.boolean().optional().default(true),
});

adminServices.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
  // Ensure provided sector exists
  const sector = await prisma.sector.findUnique({ where: { id: parsed.data.sectorId } });
  if (!sector) return res.status(400).json({ error: "Invalid sectorId" });
  try {
    const service = await prisma.service.create({ data: parsed.data });
    return res.status(201).json(service);
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Unique constraint failed (e.g., sectorId+code)
      const target = (err.meta as any)?.target;
      return res.status(409).json({ error: "Unique constraint failed", target });
    }
    throw err;
  }
});

const idParam = z.object({ id: z.string().min(1) });
const updateSchema = z.object({
  code: z.string().min(2).max(50).regex(/^[A-Z0-9_]+$/).optional(),
  name: z.string().min(2).max(200).optional(),
  active: z.boolean().optional(),
  sectorId: z.string().min(1).optional(),
});

adminServices.get("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) return res.status(404).json({ error: "Not found" });
  res.json(service);
});

adminServices.patch("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = updateSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "ValidationError", issues: body.error.issues });
  // If sectorId is being updated, ensure the sector exists
  if (body.data.sectorId) {
    const sector = await prisma.sector.findUnique({ where: { id: body.data.sectorId } });
    if (!sector) return res.status(400).json({ error: "Invalid sectorId" });
  }
  try {
    const service = await prisma.service.update({ where: { id }, data: body.data });
    res.json(service);
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = (err.meta as any)?.target;
      return res.status(409).json({ error: "Unique constraint failed", target });
    }
    throw err;
  }
});

adminServices.delete("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const links = await prisma.gtcPointService.count({ where: { serviceId: id } });
  if (links > 0) return res.status(409).json({ error: "Service is linked to points; unlink first." });
  await prisma.service.delete({ where: { id } });
  res.json({ ok: true });
});
