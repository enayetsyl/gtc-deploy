import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

export const adminPoints = Router();
adminPoints.use(requireAuth, requireRole("ADMIN"));

adminPoints.get("/", async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
  const [items, total] = await Promise.all([
    prisma.gtcPoint.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { sector: true },
    }),
    prisma.gtcPoint.count(),
  ]);
  res.json({ items, total, page, pageSize });
});

const createSchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email(),
  sectorId: z.string().min(1),
});

adminPoints.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
  const point = await prisma.gtcPoint.create({ data: parsed.data });
  res.status(201).json(point);
});

const idParam = z.object({ id: z.string().min(1) });
const updateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  email: z.string().email().optional(),
  sectorId: z.string().min(1).optional(),
});

adminPoints.get("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const point = await prisma.gtcPoint.findUnique({ where: { id }, include: { sector: true, services: true } });
  if (!point) return res.status(404).json({ error: "Not found" });
  res.json(point);
});

adminPoints.patch("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = updateSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "ValidationError", issues: body.error.issues });
  const point = await prisma.gtcPoint.update({ where: { id }, data: body.data });
  res.json(point);
});

adminPoints.delete("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const svcCount = await prisma.gtcPointService.count({ where: { gtcPointId: id } });
  if (svcCount > 0) return res.status(409).json({ error: "Point has service links; remove them first." });
  await prisma.gtcPoint.delete({ where: { id } });
  res.json({ ok: true });
});
