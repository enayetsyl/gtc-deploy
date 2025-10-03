import { Router, Request, Response } from "express";
import { z } from "zod";
// Upload feature flag wrapper
import { upload as flaggedUpload } from "../middleware/upload";
import { requireAuth, requireRole } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";
import { storage } from "../storage/provider";
import { buildPrefillPdf } from "../utils/pdf";
import { onConventionUploaded, onConventionCreated } from "../services/conventions";
import { lookup as mimeLookup } from "mime-types";
import path from "node:path";
import fs from "node:fs/promises";

export const conventionsRouter = Router();
conventionsRouter.use(requireAuth);

// 4.1b Delete a convention (only allowed when status is NEW)
conventionsRouter.delete("/:id", requireRole("GTC_POINT", "ADMIN"), async (req, res) => {
  const id = req.params.id;
  const conv = await prisma.convention.findUnique({ include: { documents: true, gtcPoint: true }, where: { id } });
  if (!conv) return res.status(404).json({ error: "Convention not found" });

  // Only allow delete if NEW
  if (conv.status !== "NEW") return res.status(409).json({ error: "Convention is finalized and cannot be deleted" });

  // Authorization: GTC_POINT may only delete their own convention
  if (req.user!.role === "GTC_POINT") {
    const belongs = await prisma.user.findFirst({ where: { id: req.user!.id, gtcPointId: conv.gtcPointId }, select: { id: true } });
    if (!belongs) return res.status(403).json({ error: "Forbidden" });
  }

  // Remove stored files if storage provider supports it - attempt best-effort
  for (const doc of conv.documents ?? []) {
    try {
      // If path looks like an UploadThing URL, some storage implementations store a key in path or uploadthingKey in other models.
      // The storage interface exposes remove(relPath) which UploadThingStorage expects a file key.
      if (doc.path) {
        // For legacy local-style paths this is a no-op for UploadThingStorage remove; best-effort.
        await storage.remove(doc.path);
      }
    } catch (e) {
      // swallow - don't block deletion if file cleanup fails
      console.error("Failed to remove file for convention document", doc.id, e);
    }
  }

  // Remove convention documents and convention record in a transaction
  await prisma.$transaction(async (tx) => {
    await tx.conventionDocument.deleteMany({ where: { conventionId: id } });
    await tx.convention.delete({ where: { id } });
  });

  return res.status(204).end();
});

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
  // Notify sector owners about the new convention
  try {
    await onConventionCreated(conv.id);
  } catch (e) {
    // non-blocking notification
  }
  res.status(201).json(conv);
});

// 4.2 Prefill PDF (no DB write) – return a flattened simple PDF
const prefillSchema = z.object({
  applicantName: z.string().min(1).optional(),
  pointName: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  sectorName: z.string().min(1).optional(),
  services: z.array(z.string()).optional(),
});
conventionsRouter.post("/prefill", requireRole("GTC_POINT", "ADMIN"), async (req, res) => {
  const parsed = prefillSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });

  let pointName = parsed.data.pointName;
  if (!pointName && req.user!.role === "GTC_POINT") {
    const me = await prisma.user.findUnique({ where: { id: req.user!.id }, include: { gtcPoint: true } });
    pointName = me?.gtcPoint?.name || undefined;
  }

  const pdf = await buildPrefillPdf({
    title: parsed.data.title,
    applicantName: parsed.data.applicantName,
    pointName,
    sectorName: parsed.data.sectorName,
    services: parsed.data.services,
  });
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


  // Allow optional multipart fields: sectorId and serviceIds
  const body = req.body || {};
  const providedSectorId = body.sectorId as string | undefined;
  let providedServiceIds: string[] | undefined;
  if (body.serviceIds) {
    try {
      if (typeof body.serviceIds === 'string') providedServiceIds = JSON.parse(body.serviceIds);
      else if (Array.isArray(body.serviceIds)) providedServiceIds = body.serviceIds as string[];
    } catch (e) {
      // ignore parse errors; leave undefined
    }
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

  // Validate provided sector/service payload and persist changes where appropriate
  // We'll update convention.sectorId if provided (and permitted) and create gtc point -> service links
  const { doc, statusChanged } = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // If a sectorId was provided, validate it exists. For both admins and point users
    // we'll allow applying the provided sectorId but we validate the sector record exists.
    // This change intentionally permits GTC_POINT users to change the convention sector via upload.
    let newSectorId: string | undefined = undefined;
    if (providedSectorId) {
      const foundSector = await tx.sector.findUnique({ where: { id: providedSectorId } });
      if (!foundSector) {
        // invalid sector id, log and ignore
        console.warn(`Upload: provided sectorId ${providedSectorId} does not exist; ignoring`);
      } else {
        newSectorId = providedSectorId;
      }
    }

    // If serviceIds provided, validate they belong to the (provided or existing) sector
    let validServiceIds: string[] | undefined;
    if (providedServiceIds && providedServiceIds.length) {
      const sectorToCheck = newSectorId ?? conv.sectorId;
      const found = await tx.service.findMany({ where: { id: { in: providedServiceIds }, sectorId: sectorToCheck } });
      const foundIds = found.map((s) => s.id);
      // If some provided ids are invalid for the sector, log a warning and proceed with the valid ones
      const invalid = providedServiceIds.filter((id) => !foundIds.includes(id));
      if (invalid.length) {
        console.warn(
          `Upload: some provided serviceIds are invalid for sector ${sectorToCheck}: ${invalid.join(",")}`
        );
      }
      validServiceIds = foundIds.length ? foundIds : undefined;
    }

    const createdDoc = await tx.conventionDocument.create({
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
    // Update status to UPLOADED if needed
    if (was !== "UPLOADED") {
      await tx.convention.update({ where: { id: conv.id }, data: { status: "UPLOADED" } });
      changed = true;
    }

    // If we have a newSectorId different from existing, update the convention
    if (newSectorId && newSectorId !== conv.sectorId) {
      await tx.convention.update({ where: { id: conv.id }, data: { sectorId: newSectorId } });
    }

    // If serviceIds were provided, ensure the gtcPoint has corresponding GtcPointService links
    if (validServiceIds && validServiceIds.length) {
      // createMany with skipDuplicates to avoid unique constraint errors
      const links = validServiceIds.map((sid) => ({ gtcPointId: conv.gtcPointId, serviceId: sid }));
      try {
        await tx.gtcPointService.createMany({ data: links, skipDuplicates: true });
      } catch (e) {
        // ignore; createMany may not be supported by some providers - fall back to upsert loop
        for (const sid of validServiceIds) {
          await tx.gtcPointService.upsert({
            where: { id: `${conv.gtcPointId}-${sid}` },
            create: { gtcPointId: conv.gtcPointId, serviceId: sid, status: "ENABLED" },
            update: {},
          } as any).catch(() => { });
        }
      }
    }

    return { doc: createdDoc, statusChanged: changed };
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

// 4.3b Create a convention and upload signed PDF in a single request
// Accepts multipart/form-data with fields: sectorId, serviceIds (optional, JSON array or repeated fields), optional gtcPointId (admin)
conventionsRouter.post(
  "/with-upload",
  requireRole("GTC_POINT", "ADMIN"),
  flaggedUpload({ multiple: false, fieldName: "file" }),
  async (req: Request, res: Response) => {
    if (process.env.UPLOADS_ENABLED !== "true") {
      return res.status(503).json({ error: "UploadsDisabled", message: "File uploads are disabled on this deployment." });
    }

    const body = req.body || {};
    // sectorId may be provided; for GTC_POINT derive from profile
    let sectorId = body.sectorId as string | undefined;
    let gtcPointId = body.gtcPointId as string | undefined;

    if (req.user!.role === "GTC_POINT") {
      const me = await prisma.user.findUnique({ where: { id: req.user!.id }, include: { gtcPoint: { include: { sector: true } } } });
      if (!me?.gtcPoint) return res.status(409).json({ error: "User is not attached to a GTC Point" });
      gtcPointId = me.gtcPoint.id;
      sectorId = me.gtcPoint.sectorId;
    } else {
      // admin must provide gtcPointId and sectorId
      if (!gtcPointId || !sectorId) return res.status(400).json({ error: "gtcPointId and sectorId are required for admin" });
    }

    // file from multer
    let file: Express.Multer.File | undefined;
    if (req.files) {
      const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
      file = files.find((f: any) => f.fieldname === 'file');
    }
    if (!file) return res.status(400).json({ error: "file is required (multipart/form-data)" });

    // PDF magic bytes: %PDF
    const b = file.buffer;
    const isPdfMagic = b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
    if (!isPdfMagic) return res.status(400).json({ error: "File does not look like a valid PDF" });

    const mime = file.mimetype || "application/pdf";
    if (!String(mime).startsWith("application/pdf")) return res.status(400).json({ error: "Only PDF uploads are allowed" });

    // parse serviceIds if present (allow JSON string or repeated fields)
    let serviceIds: string[] | undefined;
    if (body.serviceIds) {
      try {
        if (typeof body.serviceIds === 'string') {
          // try JSON parse
          serviceIds = JSON.parse(body.serviceIds);
        } else if (Array.isArray(body.serviceIds)) {
          serviceIds = body.serviceIds as string[];
        }
      } catch (e) {
        // ignore parse errors
      }
    }

    // create convention and store file in a transaction
    const stored = await storage.put({ buffer: file.buffer, mime: String(mime), originalName: file.originalname });

    const { doc, conv } = await prisma.$transaction(async (tx) => {
      const createdConv = await tx.convention.create({ data: { gtcPointId: gtcPointId!, sectorId: sectorId!, status: "UPLOADED" as any } });
      const created = await tx.conventionDocument.create({
        data: {
          conventionId: createdConv.id,
          kind: "SIGNED",
          fileName: stored.fileName,
          path: stored.path,
          mime: stored.mime,
          size: stored.size,
          checksum: stored.checksum,
          uploadedById: req.user!.id,
        },
      });

      return { doc: created, conv: createdConv };
    });

    try {
      await onConventionCreated(conv.id);
    } catch (e) { }
    try {
      await onConventionUploaded(conv.id);
    } catch (e) { }

    res.status(201).json({ ok: true, convention: conv, document: doc });
  }
);