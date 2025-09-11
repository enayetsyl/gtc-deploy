import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

export const adminServices = Router();
adminServices.use(requireAuth, requireRole("ADMIN"));

adminServices.get("/", async (req, res) => {
  const items = await prisma.service.findMany({ orderBy: { createdAt: "desc" } });
  res.json(items);
});

const createSchema = z.object({
  code: z.string().min(2).max(50).regex(/^[A-Z0-9_]+$/),
  name: z.string().min(2).max(200),
  active: z.boolean().optional().default(true),
});

adminServices.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
  const service = await prisma.service.create({ data: parsed.data });
  res.status(201).json(service);
});

const idParam = z.object({ id: z.string().min(1) });
const updateSchema = z.object({
  code: z.string().min(2).max(50).regex(/^[A-Z0-9_]+$/).optional(),
  name: z.string().min(2).max(200).optional(),
  active: z.boolean().optional(),
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
  const service = await prisma.service.update({ where: { id }, data: body.data });
  res.json(service);
});

adminServices.delete("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const links = await prisma.gtcPointService.count({ where: { serviceId: id } });
  if (links > 0) return res.status(409).json({ error: "Service is linked to points; unlink first." });
  await prisma.service.delete({ where: { id } });
  res.json({ ok: true });
});
