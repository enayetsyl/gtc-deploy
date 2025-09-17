import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { createOnboardingLink, approveOnboarding, declineOnboarding } from "../services/onboarding";
import { prisma } from "../lib/prisma";

export const adminPointsOnboarding = Router();
adminPointsOnboarding.use(requireAuth, requireRole("ADMIN"));

adminPointsOnboarding.get("/", async (req, res) => {
  const status = (req.query.status as string | undefined) ?? undefined;
  const where: any = {};
  if (status) where.status = status;
  const items = await (prisma as any).pointOnboarding.findMany({ where, orderBy: { createdAt: "desc" }, include: { services: true, sector: true } });
  res.json({ items });
});

const createSchema = z.object({
  sectorId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(2),
  includeServices: z.boolean().default(false),
  serviceIds: z.array(z.string().min(1)).optional(),
});
adminPointsOnboarding.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
  const ob = await createOnboardingLink(parsed.data);
  res.status(201).json(ob);
});

adminPointsOnboarding.post("/:id/approve", async (req, res) => {
  const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
  const result = await approveOnboarding(id, req.user!.id);
  res.json(result);
});

adminPointsOnboarding.post("/:id/decline", async (req, res) => {
  const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
  await declineOnboarding(id, req.user!.id);
  res.json({ ok: true });
});

export default adminPointsOnboarding;
