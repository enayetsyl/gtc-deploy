"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadsPublic = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const upload_1 = require("../middleware/upload");
const prisma_1 = require("../lib/prisma");
const leads_1 = require("../services/leads");
exports.leadsPublic = (0, express_1.Router)();
// In-memory rate limiting storage
const rateLimitStore = new Map();
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
async function throttle(req, res, next) {
    try {
        const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "ip:unknown";
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
    }
    catch {
        // fail-open on throttle errors
        next();
    }
}
// Upload flag: when disabled, flaggedUpload is a no-op so req.files stays empty.
const schema = zod_1.z.object({
    sectorId: zod_1.z.string().min(1),
    name: zod_1.z.string().min(2).max(200),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().min(6).max(32).optional(),
    message: zod_1.z.string().max(2000).optional(),
    gdprAgree: zod_1.z.coerce.boolean().refine((v) => v === true, "Consent required"),
    // UploadThing file URLs - sent after client uploads files
    fileUrls: zod_1.z.array(zod_1.z.object({
        url: zod_1.z.string().url(),
        name: zod_1.z.string(),
        size: zod_1.z.number(),
        type: zod_1.z.string(),
        key: zod_1.z.string(), // UploadThing file key
    })).optional(),
});
// Basic MIME whitelist
const ALLOWED = new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
]);
exports.leadsPublic.post("/", throttle, (0, upload_1.upload)({ multiple: true, fieldName: "files" }), async (req, res) => {
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
    let legacyFiles = [];
    if (req.files) {
        if (Array.isArray(req.files)) {
            legacyFiles = req.files;
        }
        else {
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
    const uploadedFiles = [];
    if (legacyFiles.length) {
        const { storage } = await Promise.resolve().then(() => __importStar(require("../storage/provider")));
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
            }
            catch (error) {
                console.error("Error uploading legacy file:", error);
                return res.status(500).json({
                    message: "File upload failed",
                    error: error instanceof Error ? error.message : "Unknown error"
                });
            }
        }
    }
    // Now do the database transaction (much faster without file uploads)
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
    await (0, leads_1.onLeadCreated)(lead.id);
    res.status(201).json({ ok: true, id: lead.id });
});
