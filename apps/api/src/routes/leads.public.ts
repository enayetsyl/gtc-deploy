import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { upload as flaggedUpload } from "../middleware/upload";
import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";
import { onLeadCreated } from "../services/leads";

export const leadsPublic = Router();

// In-memory rate limiting storage
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

// Simple IP throttle via in-memory storage (e.g., 5 req / 5 min)
async function throttle(req: Request, res: Response, next: NextFunction) {
  try {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "ip:unknown";
    const key = `rl:leads_public:${ip}`;
    const max = 5;
    const ttlSec = 5 * 60;
    const now = Date.now();
    const resetAt = now + (ttlSec * 1000);

    let entry = rateLimitStore.get(key);
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt };
      rateLimitStore.set(key, entry);
    }

    entry.count++;

    if (entry.count > max) {
      const remainingMs = Math.max(entry.resetAt - now, 0);
      const remainingSec = Math.ceil(remainingMs / 1000);
      res.setHeader("Retry-After", String(remainingSec));
      return res.status(429).json({ error: "Too many submissions. Try again later." });
    }
    next();
  } catch {
    // fail-open on throttle errors
    next();
  }
}

// Upload flag: when disabled, flaggedUpload is a no-op so req.files stays empty.

const schema = z.object({
  sectorId: z.string().min(1),
  name: z.string().min(2).max(200),
  email: z.string().email().optional(),
  phone: z.string().min(6).max(32).optional(),
  message: z.string().max(2000).optional(),
  gdprAgree: z.coerce.boolean().refine((v) => v === true, "Consent required"),
  // UploadThing file URLs - sent after client uploads files
  fileUrls: z.array(z.object({
    url: z.string().url(),
    name: z.string(),
    size: z.number(),
    type: z.string(),
    key: z.string(), // UploadThing file key
  })).optional(),
});

// Basic MIME whitelist
const ALLOWED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
]);

leadsPublic.post("/", throttle, flaggedUpload({ multiple: true, fieldName: "files" }), async (req: Request, res: Response) => {
  console.log("Leads submission request:", {
    contentType: req.headers['content-type'],
    body: req.body,
    files: req.files,
    method: req.method
  });

  // Handle both JSON and form-data
  let requestData = req.body;

  // If it's form-data, check if sectorId is in a different field
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    console.log("Processing multipart/form-data");

    // Find sectorId in the body - it might be under a different key
    const bodyKeys = Object.keys(req.body);
    const sectorIdKey = bodyKeys.find(key => key.length > 10 && key !== 'name' && key !== 'email' && key !== 'phone' && key !== 'message' && key !== 'gdprAgree');

    if (sectorIdKey && !req.body.sectorId) {
      console.log("Found sectorId under key:", sectorIdKey);
      requestData = {
        ...req.body,
        sectorId: sectorIdKey // Use the key as the sectorId value
      };
    }
  }

  console.log("Processed request data:", requestData);

  const body = schema.safeParse(requestData);
  if (!body.success) {
    console.log("Validation failed:", body.error.issues);
    return res.status(400).json({ error: "ValidationError", issues: body.error.issues });
  }

  // Create lead + store file references
  const fileUrls = body.data.fileUrls ?? [];

  // Handle files from multer.any() - can be array or undefined
  let legacyFiles: Express.Multer.File[] = [];
  if (req.files) {
    if (Array.isArray(req.files)) {
      legacyFiles = req.files;
    } else {
      // req.files is an object with field names as keys
      legacyFiles = Object.values(req.files).flat();
    }
  }

  console.log("Files to process:", { fileUrls: fileUrls.length, legacyFiles: legacyFiles.length });
  if (legacyFiles.length > 0) {
    console.log("Legacy files:", legacyFiles.map(f => ({
      fieldname: f.fieldname,
      originalname: f.originalname,
      mimetype: f.mimetype,
      size: f.size
    })));
  }

  // Upload legacy files BEFORE starting database transaction
  const uploadedFiles: Array<{
    fileName: string;
    path: string;
    mime: string;
    size: number;
    checksum: string;
    uploadthingKey?: string;
  }> = [];
  if (legacyFiles.length) {
    const { storage } = await import("../storage/provider");

    for (const f of legacyFiles) {
      const mime = f.mimetype?.toLowerCase() || "application/octet-stream";
      if (!ALLOWED.has(mime)) {
        continue; // Skip disallowed files
      }

      try {
        console.log(`Uploading legacy file: ${f.originalname}, size: ${f.size}, mime: ${mime}`);

        const stored = await storage.put({
          buffer: f.buffer,
          mime,
          originalName: f.originalname,
        });

        console.log(`Successfully uploaded: ${stored.path}`);

        uploadedFiles.push({
          fileName: stored.fileName,
          path: stored.path,
          mime: stored.mime,
          size: stored.size,
          checksum: stored.checksum,
          uploadthingKey: stored.uploadthingKey,
        });
      } catch (error) {
        console.error("Error uploading legacy file:", error);
        return res.status(500).json({
          message: "File upload failed",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  }

  // Now do the database transaction (much faster without file uploads)
  const lead = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.lead.create({
      data: {
        sectorId: body.data.sectorId,
        name: body.data.name,
        email: body.data.email,
        phone: body.data.phone,
        message: body.data.message,
      },
    });

    if (fileUrls.length) {
      for (const fileData of fileUrls) {
        // Basic MIME type validation
        const mime = fileData.type.toLowerCase();
        if (!ALLOWED.has(mime)) {
          continue; // Skip disallowed files
        }

        await tx.leadAttachment.create({
          data: {
            leadId: created.id,
            fileName: fileData.name,
            path: fileData.url, // UploadThing URL
            mime: fileData.type,
            size: fileData.size,
            checksum: "", // We don't have checksum from UploadThing
            // uploadthingKey: fileData.key, // TODO: Add after migration
          },
        });
      }
    }

    // Handle UploadThing files (already uploaded by client)
    if (fileUrls.length) {
      for (const fileData of fileUrls) {
        // Basic MIME type validation
        const mime = fileData.type.toLowerCase();
        if (!ALLOWED.has(mime)) {
          continue; // Skip disallowed files
        }

        await tx.leadAttachment.create({
          data: {
            leadId: created.id,
            fileName: fileData.name,
            path: fileData.url, // UploadThing URL
            mime: fileData.type,
            size: fileData.size,
            checksum: "", // We don't have checksum from UploadThing
            // uploadthingKey: fileData.key, // TODO: Add after migration
          },
        });
      }
    }

    // Handle pre-uploaded legacy files
    if (uploadedFiles.length) {
      for (const fileData of uploadedFiles) {
        await tx.leadAttachment.create({
          data: {
            leadId: created.id,
            fileName: fileData.fileName,
            path: fileData.path,
            mime: fileData.mime,
            size: fileData.size,
            checksum: fileData.checksum,
            // uploadthingKey: fileData.uploadthingKey, // TODO: Add after migration
          },
        });
      }
    }

    return created;
  });

  // Fan-out
  await onLeadCreated(lead.id);

  res.status(201).json({ ok: true, id: lead.id });
});
