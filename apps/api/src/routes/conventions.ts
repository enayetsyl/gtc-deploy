import { Router, Request, Response } from "express";
import { z } from "zod";
// Upload feature flag wrapper
import { upload as flaggedUpload } from "../middleware/upload";
import { requireAuth, requireRole } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";
import { storage } from "../storage/provider";
import { buildPrefillPdf } from "../utils/pdf";
import { onConventionUploaded } from "../services/conventions";
import { lookup as mimeLookup } from "mime-types";
import path from "node:path";
import fs from "node:fs/promises";

export const conventionsRouter = Router();
conventionsRouter.use(requireAuth);

// 4.1 Create a convention (GTC point or admin)
const createSchema = z.object({
  gtcPointId: z.string().uuid().optional(), // admin may specify; point users derive from profile
  sectorId: z.string().uuid().optional(),   // admin may specify
});
conventionsRouter.post("/", requireRole("GTC_POINT", "ADMIN"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });

  let { gtcPointId, sectorId } = parsed.data;

  // If GTC_POINT user, derive from their mapping
  if (req.user!.role === "GTC_POINT") {
    const me = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { gtcPoint: { include: { sector: true } } },
    });
    if (!me?.gtcPoint) return res.status(409).json({ error: "User is not attached to a GTC Point" });
    gtcPointId = me.gtcPoint.id;
    sectorId = me.gtcPoint.sectorId;
  } else {
    // admin path: both ids required
    if (!gtcPointId || !sectorId) return res.status(400).json({ error: "gtcPointId and sectorId are required for admin" });
  }

  const conv = await prisma.convention.create({
    data: { gtcPointId: gtcPointId!, sectorId: sectorId!, status: "NEW" as any },
  });
  res.status(201).json(conv);
});

// 4.2 Prefill PDF (no DB write) – return a flattened simple PDF
const prefillSchema = z.object({
  applicantName: z.string().min(1).optional(),
  pointName: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
});
conventionsRouter.post("/prefill", requireRole("GTC_POINT", "ADMIN"), async (req, res) => {
  const parsed = prefillSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });

  let pointName = parsed.data.pointName;
  if (!pointName && req.user!.role === "GTC_POINT") {
    const me = await prisma.user.findUnique({ where: { id: req.user!.id }, include: { gtcPoint: true } });
    pointName = me?.gtcPoint?.name || undefined;
  }

  const pdf = await buildPrefillPdf({ title: parsed.data.title, applicantName: parsed.data.applicantName, pointName });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="convention-prefill.pdf"`);
  res.send(pdf);
});

// 4.3 Upload signed convention file (feature-flagged). When UPLOADS_ENABLED!=='true', this becomes a no-op
conventionsRouter.post("/:id/upload", requireRole("GTC_POINT", "ADMIN"), flaggedUpload({ multiple: false, fieldName: "file" }), async (req: Request, res: Response) => {
  if (process.env.UPLOADS_ENABLED !== "true") {
    return res.status(503).json({ error: "UploadsDisabled", message: "File uploads are disabled on this deployment." });
  }
  const id = req.params.id;
  const conv = await prisma.convention.findUnique({ where: { id }, include: { gtcPoint: true, sector: true } });
  if (!conv) return res.status(404).json({ error: "Convention not found" });

  // GTC point can only upload to its own convention
  if (req.user!.role === "GTC_POINT") {
    const belongs = await prisma.user.findFirst({
      where: { id: req.user!.id, gtcPointId: conv.gtcPointId },
      select: { id: true },
    });
    if (!belongs) return res.status(403).json({ error: "Forbidden" });
  }

  // Handle file from multer.any() - files are in req.files array
  let file: Express.Multer.File | undefined;
  if (req.files) {
    const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    file = files.find((f: any) => f.fieldname === 'file');
  }

  if (!file) return res.status(400).json({ error: "file is required (multipart/form-data)" });

  if (conv.status === "APPROVED" || conv.status === "DECLINED") {
    return res.status(409).json({ error: "Convention is finalized; uploads are locked" });
  }

  const was = conv.status;

  // PDF magic bytes: %PDF
  const b = file.buffer;
  const isPdfMagic = b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
  if (!isPdfMagic) return res.status(400).json({ error: "File does not look like a valid PDF" });

  const mime = file.mimetype || mimeLookup(file.originalname) || "application/octet-stream";
  if (!String(mime).startsWith("application/pdf")) {
    return res.status(400).json({ error: "Only PDF uploads are allowed" });
  }

  const stored = await storage.put({ buffer: file.buffer, mime: String(mime), originalName: file.originalname });

  const { doc, statusChanged } = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.conventionDocument.create({
      data: {
        conventionId: conv.id,
        kind: "SIGNED",
        fileName: stored.fileName,
        path: stored.path,
        mime: stored.mime,
        size: stored.size,
        checksum: stored.checksum,
        uploadedById: req.user!.id,
      },
    });

    let changed = false;
    if (was !== "UPLOADED") {
      await tx.convention.update({ where: { id: conv.id }, data: { status: "UPLOADED" } });
      changed = true;
    }
    return { doc: created, statusChanged: changed };
  }, {
    maxWait: 10000, // 10 seconds
    timeout: 15000, // 15 seconds
  });

  if (statusChanged) {
    await onConventionUploaded(conv.id);
  }

  res.status(201).json({ ok: true, document: doc, downloadUrl: `/uploads${stored.path}` });
});

// 4.4 List my conventions (point sees own, admin sees all)
conventionsRouter.get("/", requireRole("GTC_POINT", "ADMIN"), async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));

  const where =
    req.user!.role === "ADMIN"
      ? {}
      : {
        gtcPoint: { users: { some: { id: req.user!.id } } },
      };

  const [items, total] = await Promise.all([
    prisma.convention.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { gtcPoint: true, sector: true, documents: { orderBy: { createdAt: "desc" } } },
    }),
    prisma.convention.count({ where }),
  ]);

  res.json({ items, total, page, pageSize });
});


// list documents for a convention
conventionsRouter.get("/:id/documents", requireRole("GTC_POINT", "ADMIN"), async (req, res) => {
  const id = req.params.id;
  const docConv = await prisma.convention.findUnique({
    where: { id },
    include: { gtcPoint: { include: { users: { select: { id: true } } } }, documents: true },
  });
  if (!docConv) return res.status(404).json({ error: "Convention not found" });

  if (req.user!.role !== "ADMIN") {
    const allowed = docConv.gtcPoint.users.some((u: { id: string }) => u.id === req.user!.id);
    if (!allowed) return res.status(403).json({ error: "Forbidden" });
  }

  res.json({ items: docConv.documents });
});

// download a single document (auth-checked)
conventionsRouter.get("/:id/documents/:docId/download", requireRole("GTC_POINT", "ADMIN"), async (req, res) => {
  const { id, docId } = req.params;
  const doc = await prisma.conventionDocument.findUnique({
    where: { id: docId },
    include: { convention: { include: { gtcPoint: { include: { users: { select: { id: true } } } } } } },
  });
  if (!doc || doc.conventionId !== id) return res.status(404).json({ error: "Document not found" });

  if (req.user!.role !== "ADMIN") {
    const allowed = doc.convention.gtcPoint.users.some((u: { id: string }) => u.id === req.user!.id);
    if (!allowed) return res.status(403).json({ error: "Forbidden" });
  }

  const absPath = path.resolve("uploads", "." + doc.path); // same folder you already use
  try {
    await fs.access(absPath);
  } catch {
    return res.status(410).json({ error: "File missing from storage" });
  }

  res.setHeader("Content-Type", doc.mime);
  res.setHeader("Content-Disposition", `attachment; filename="${doc.fileName}"`);
  res.sendFile(absPath);
});