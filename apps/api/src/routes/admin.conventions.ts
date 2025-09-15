import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { onConventionDecision } from "../services/conventions";
import path from "node:path";
import fs from "node:fs/promises";
import archiver from "archiver";
import sanitize from "sanitize-filename";

export const adminConventions = Router();
adminConventions.use(requireAuth, requireRole("ADMIN"));

// list (basic filters)
adminConventions.get("/", async (req, res) => {
  const status = (req.query.status as string | undefined)?.toUpperCase() as
    | "NEW"
    | "UPLOADED"
    | "APPROVED"
    | "DECLINED"
    | undefined;

  const where = status ? { status: status as any } : {};
  const items = await prisma.convention.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { gtcPoint: true, sector: true, documents: { orderBy: { createdAt: "desc" } } },
    take: 200,
  });
  res.json({ items });
});

// decision (approve/decline, optional internalSalesRep)
const decisionSchema = z.object({
  action: z.enum(["APPROVE", "DECLINE"]),
  internalSalesRep: z.string().min(1).optional(),
});
adminConventions.patch("/:id", async (req, res) => {
  const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
  const body = decisionSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "ValidationError", issues: body.error.issues });

  const approved = body.data.action === "APPROVE";
  const conv = await prisma.convention.update({
    where: { id },
    data: {
      status: approved ? "APPROVED" : "DECLINED",
      internalSalesRep: body.data.internalSalesRep,
    },
  });

  await onConventionDecision(conv.id, approved, body.data.internalSalesRep);

  res.json(conv);
});


// GET /api/admin/conventions/:id/archive → zip all documents for a convention (admin-only)
adminConventions.get("/:id/archive", async (req, res) => {
  const { id } = z.object({ id: z.string().min(1) }).parse(req.params);

  // pull convention + docs (ordered newest first)
  const conv = await prisma.convention.findUnique({
    where: { id },
    include: { gtcPoint: true, sector: true, documents: { orderBy: { createdAt: "desc" } } },
  });
  if (!conv) return res.status(404).json({ error: "Convention not found" });

  // filename: convention-<id>-<point>-<sector>.zip (sanitized)
  const safePoint = sanitize(conv.gtcPoint?.name ?? "point");
  const safeSector = sanitize(conv.sector?.name ?? "sector");
  const zipName = `convention-${conv.id}-${safePoint}-${safeSector}.zip`;

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err) => {
    // terminate stream on error
    res.status(500).end();
  });

  archive.pipe(res);

  // add each existing file by absolute path; name inside zip = timestamp_kind_filename
  for (const d of conv.documents) {
    const absPath = path.resolve("uploads", "." + d.path); // mirrors your single-file download path
    try {
      await fs.access(absPath);
      const ts = new Date(d.createdAt).toISOString().replace(/[:T]/g, "-").slice(0, 19);
      const entryName = `${ts}_${d.kind}_${sanitize(d.fileName)}`;
      archive.file(absPath, { name: entryName });
    } catch {
      // skip missing file (keeps export resilient)
    }
  }

  // finalize stream
  void archive.finalize();
});