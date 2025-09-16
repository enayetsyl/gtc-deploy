import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import { prisma } from "../lib/prisma";
import { storage } from "../storage/provider";
import { onLeadCreated } from "../services/leads";
import { lookup as mimeLookup } from "mime-types";
import { redis } from "../lib/redis";

export const leadsPublic = Router();

// Simple IP throttle via Redis (e.g., 5 req / 5 min)
async function throttle(req: any, res: any, next: any) {
  try {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "ip:unknown";
    const key = `rl:leads_public:${ip}`;
    const max = 5;
    const ttlSec = 5 * 60;

    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, ttlSec);

    if (count > max) {
      const ttl = await redis.ttl(key);
      res.setHeader("Retry-After", String(Math.max(ttl, 0)));
      return res.status(429).json({ error: "Too many submissions. Try again later." });
    }
    next();
  } catch {
    // fail-open on throttle errors
    next();
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 }, // 10MB/file, max 5 files
});

const schema = z.object({
  sectorId: z.string().min(1),
  name: z.string().min(2).max(200),
  email: z.string().email().optional(),
  phone: z.string().min(6).max(32).optional(),
  message: z.string().max(2000).optional(),
  gdprAgree: z.coerce.boolean().refine((v) => v === true, "Consent required"),
});

// Basic MIME whitelist
const ALLOWED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
]);

leadsPublic.post("/", throttle, upload.array("files", 5), async (req, res) => {
  const body = schema.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "ValidationError", issues: body.error.issues });
  }

  // create lead + store files
  const files = (req.files as Express.Multer.File[]) ?? [];

  const lead = await prisma.$transaction(async (tx) => {
    const created = await tx.lead.create({
      data: {
        sectorId: body.data.sectorId,
        name: body.data.name,
        email: body.data.email,
        phone: body.data.phone,
        message: body.data.message,
      },
    });

    if (files.length) {
      for (const f of files) {
        const mimeGuess = f.mimetype || (mimeLookup(f.originalname) as string) || "application/octet-stream";
        const mime = String(mimeGuess).toLowerCase();

        if (!ALLOWED.has(mime)) {
          // skip disallowed files silently (or return 400 if you prefer strict)
          continue;
        }

        const stored = await storage.put({
          buffer: f.buffer,
          mime,
          originalName: f.originalname,
        });

        await tx.leadAttachment.create({
          data: {
            leadId: created.id,
            fileName: stored.fileName,
            path: stored.path,
            mime: stored.mime,
            size: stored.size,
            checksum: stored.checksum,
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
