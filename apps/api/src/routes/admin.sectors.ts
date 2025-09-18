import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import argon2 from "argon2";
import { enqueueEmail } from "../queues/email";
import { signInviteToken } from "../lib/jwt";
import { env } from "../config/env";

export const adminSectors = Router();
adminSectors.use(requireAuth, requireRole("ADMIN"));

// list with basic pagination
adminSectors.get("/", async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
  const [items, total] = await Promise.all([
    prisma.sector.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.sector.count(),
  ]);
  res.json({ items, total, page, pageSize });
});

const createSchema = z.object({ name: z.string().min(2).max(100) });

adminSectors.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
  const sector = await prisma.sector.create({ data: parsed.data });
  res.status(201).json(sector);
});

const idParam = z.object({ id: z.string().min(1) });
const updateSchema = z.object({ name: z.string().min(2).max(100) });

adminSectors.get("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const sector = await prisma.sector.findUnique({ where: { id } });
  if (!sector) return res.status(404).json({ error: "Not found" });
  res.json(sector);
});

adminSectors.patch("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = updateSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "ValidationError", issues: body.error.issues });
  const sector = await prisma.sector.update({ where: { id }, data: body.data });
  res.json(sector);
});

adminSectors.delete("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  // optional safety: prevent delete if points exist
  const count = await prisma.gtcPoint.count({ where: { sectorId: id } });
  if (count > 0) return res.status(409).json({ error: "Sector has points; move or delete them first." });
  await prisma.sector.delete({ where: { id } });
  res.json({ ok: true });
});

// Create a sector owner (ADMIN only)
const createOwnerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  sectorId: z.string().min(1),
  sendInvite: z.boolean().optional().default(true),
});

adminSectors.post("/sector-owners", async (req, res) => {
  const parsed = createOwnerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
  const { name, email, sectorId, sendInvite } = parsed.data;

  // ensure sector exists
  const sector = await prisma.sector.findUnique({ where: { id: sectorId } });
  if (!sector) return res.status(404).json({ error: "Sector not found" });

  // unique email
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already in use" });

  // If no invite, require a server-generated temp password (we'll set a random hash anyway)
  // For invite flow, set a random hash now; they'll change it upon invite acceptance
  const tempHash = await argon2.hash("temp:" + Math.random().toString(36).slice(2));

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: tempHash,
      role: "SECTOR_OWNER" as any,
      sectorId,
    },
    select: { id: true, name: true, email: true, role: true, sectorId: true, createdAt: true },
  });

  if (sendInvite) {
    const { token } = await signInviteToken(user.id);
    const link = `${env.webBaseUrl.replace(/\/$/, "")}/invite/accept?token=${encodeURIComponent(token)}`;
    await enqueueEmail({
      to: user.email,
      subject: "You're invited as Sector Owner",
      html: `<p>Hello ${user.name},</p><p>You've been added as a Sector Owner for <strong>${sector.name}</strong>. To activate your account and set your password, click: <a href="${link}">${link}</a></p>`,
    });
  }

  res.status(201).json(user);
});
