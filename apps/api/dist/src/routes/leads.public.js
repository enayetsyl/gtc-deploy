"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadsPublic = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const multer_1 = __importDefault(require("multer"));
const prisma_1 = require("../lib/prisma");
const provider_1 = require("../storage/provider");
const leads_1 = require("../services/leads");
const mime_types_1 = require("mime-types");
const redis_1 = require("../lib/redis");
exports.leadsPublic = (0, express_1.Router)();
// Simple IP throttle via Redis (e.g., 5 req / 5 min)
async function throttle(req, res, next) {
    try {
        const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "ip:unknown";
        const key = `rl:leads_public:${ip}`;
        const max = 5;
        const ttlSec = 5 * 60;
        const count = await redis_1.redis.incr(key);
        if (count === 1)
            await redis_1.redis.expire(key, ttlSec);
        if (count > max) {
            const ttl = await redis_1.redis.ttl(key);
            res.setHeader("Retry-After", String(Math.max(ttl, 0)));
            return res.status(429).json({ error: "Too many submissions. Try again later." });
        }
        next();
    }
    catch {
        // fail-open on throttle errors
        next();
    }
}
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 5 }, // 10MB/file, max 5 files
});
const schema = zod_1.z.object({
    sectorId: zod_1.z.string().min(1),
    name: zod_1.z.string().min(2).max(200),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().min(6).max(32).optional(),
    message: zod_1.z.string().max(2000).optional(),
    gdprAgree: zod_1.z.coerce.boolean().refine((v) => v === true, "Consent required"),
});
// Basic MIME whitelist
const ALLOWED = new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
]);
exports.leadsPublic.post("/", throttle, upload.array("files", 5), async (req, res) => {
    const body = schema.safeParse(req.body);
    if (!body.success) {
        return res.status(400).json({ error: "ValidationError", issues: body.error.issues });
    }
    // create lead + store files
    const files = req.files ?? [];
    const lead = await prisma_1.prisma.$transaction(async (tx) => {
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
                const mimeGuess = f.mimetype || (0, mime_types_1.lookup)(f.originalname) || "application/octet-stream";
                const mime = String(mimeGuess).toLowerCase();
                if (!ALLOWED.has(mime)) {
                    // skip disallowed files silently (or return 400 if you prefer strict)
                    continue;
                }
                const stored = await provider_1.storage.put({
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
    await (0, leads_1.onLeadCreated)(lead.id);
    res.status(201).json({ ok: true, id: lead.id });
});
