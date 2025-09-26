import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";
import { requireAuth, requireRole } from "../middleware/auth";
import argon2 from "argon2";
import { sendEmail } from "../lib/mailer";
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

// Create a sector owner (ADMIN only)
// Accept either a single sectorId (backwards compat) or an array of sectorIds for multi-select
const createOwnerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  sectorId: z.string().min(1).optional(),
  sectorIds: z.array(z.string().min(1)).optional(),
  sendInvite: z.boolean().optional().default(true),
});

// -------- Sector Owners: list & update (edit + assign/remove sectors) --------

// Paged list of sector owners with their sector memberships
adminSectors.get("/sector-owners", async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where: { role: "SECTOR_OWNER" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { userSectors: { include: { sector: true } } },
    }),
    prisma.user.count({ where: { role: "SECTOR_OWNER" } }),
  ]);

  const shaped = items.map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    sectorId: u.sectorId, // primary sector
    createdAt: u.createdAt,
    sectors: u.userSectors.map((us: any) => us.sector),
  }));
  res.json({ items: shaped, total, page, pageSize });
});

adminSectors.post("/sector-owners", async (req, res) => {
  const parsed = createOwnerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
  const { name, email, sectorId, sectorIds, sendInvite } = parsed.data;

  // Normalize sectorIds: prefer sectorIds array, fall back to sectorId string
  const resolvedSectorIds = Array.isArray(sectorIds) && sectorIds.length > 0 ? sectorIds : sectorId ? [sectorId] : [];
  if (resolvedSectorIds.length === 0) return res.status(400).json({ error: "No sector specified" });

  // ensure all sectors exist
  const found = await prisma.sector.findMany({ where: { id: { in: resolvedSectorIds } } });
  if (found.length !== resolvedSectorIds.length) return res.status(404).json({ error: "One or more sectors not found" });

  // unique email
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already in use" });

  // If no invite, require a server-generated temp password (we'll set a random hash anyway)
  // For invite flow, set a random hash now; they'll change it upon invite acceptance
  const tempHash = await argon2.hash("temp:" + Math.random().toString(36).slice(2));

  // Create user with the first sector as the primary sectorId (keeps schema-compatible)
  const primarySectorId = resolvedSectorIds[0];
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: tempHash,
      role: "SECTOR_OWNER" as any,
      sectorId: primarySectorId,
    },
    select: { id: true, name: true, email: true, role: true, sectorId: true, createdAt: true },
  });

  // Persist many-to-many links in UserSector for all selected sectors
  try {
    await prisma.userSector.createMany({
      data: resolvedSectorIds.map((sid) => ({ userId: user.id, sectorId: sid })),
      skipDuplicates: true,
    });
  } catch (err) {
    // Log but don't fail the request for now
    console.warn("Failed to create user-sector links:", err);
  }

  if (sendInvite) {
    const { token } = await signInviteToken(user.id);
    const primarySector = found.find((s: any) => s.id === primarySectorId);
    const link = `${env.webBaseUrl.replace(/\/$/, "")}/invite/accept?token=${encodeURIComponent(token)}`;
    await sendEmail({
      to: user.email,
      subject: "Sei stato invitato come Responsabile del Settore",
      html: `
        <p>Ciao ${user.name},</p>
        <p>Sei stato aggiunto come Responsabile del Settore per <strong>${primarySector?.name ?? "i tuoi settori"}</strong>.</p>
        <p>
          <a href="${link}" style="display:inline-block;padding:12px 20px;background-color:#2563eb;color:#ffffff;border-radius:6px;text-decoration:none;font-weight:600;">Attiva l'account e imposta la password</a>
        </p>
        <p style="color:#6b7280;font-size:13px">Se il pulsante non funziona, copia e incolla questo link nel tuo browser:</p>
        <p style="word-break:break-all;"><a href="${link}">${link}</a></p>
      `,
    });
  }



  res.status(201).json(user);
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



const updateOwnerSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().optional(),
  sectorIds: z.array(z.string().min(1)).min(1, "At least one sector required").optional(),
});

/**
 * PATCH /api/admin/sectors/sector-owners/:id
 * Body: { name?, email?, sectorIds?[] }
 * - If sectorIds provided: replace full membership (ensuring at least one) and set primary sectorId to first element
 */
adminSectors.patch("/sector-owners/:id", async (req, res) => {
  const { id } = idParam.parse({ id: req.params.id });
  const parsed = updateOwnerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });

  const body = parsed.data;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.role !== "SECTOR_OWNER") return res.status(404).json({ error: "Not found" });

  // Handle email uniqueness if changed
  if (body.email && body.email !== existing.email) {
    const dup = await prisma.user.findUnique({ where: { email: body.email } });
    if (dup) return res.status(409).json({ error: "Email already in use" });
  }

  // If sectorIds provided, validate and sync membership inside a transaction
  let updatedUser;
  if (body.sectorIds && body.sectorIds.length) {
    const sectorIds = Array.from(new Set(body.sectorIds));
    const found = await prisma.sector.findMany({ where: { id: { in: sectorIds } } });
    if (found.length !== sectorIds.length) return res.status(404).json({ error: "One or more sectors not found" });

    updatedUser = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Update primary sector on user (first in array) + name/email if provided
      const u = await tx.user.update({
        where: { id },
        data: {
          name: body.name ?? undefined,
          email: body.email ?? undefined,
          sectorId: sectorIds[0],
        },
      });
      // Remove memberships not in the new list
      await tx.userSector.deleteMany({ where: { userId: id, sectorId: { notIn: sectorIds } } });
      // Create remaining memberships in bulk. Use skipDuplicates to avoid unique constraint errors
      // if some memberships already exist. This reduces many round-trips and avoids many awaits
      // inside the transaction which can sometimes lead to stale transaction state.
      if (sectorIds.length > 0) {
        await tx.userSector.createMany({
          data: sectorIds.map((sid) => ({ userId: id, sectorId: sid })),
          skipDuplicates: true,
        });
      }
      return u;
    });
  } else {
    // Only name/email changed
    updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        email: body.email ?? undefined,
      },
    });
  }

  // Reload with sectors
  const withSectors = await prisma.user.findUnique({
    where: { id: updatedUser.id },
    include: { userSectors: { include: { sector: true } } },
  });
  if (!withSectors) return res.status(500).json({ error: "ReloadFailed" });

  res.json({
    id: withSectors.id,
    name: withSectors.name,
    email: withSectors.email,
    role: withSectors.role,
    sectorId: withSectors.sectorId,
    createdAt: withSectors.createdAt,
    sectors: withSectors.userSectors.map((us: any) => us.sector),
  });
});
