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
exports.pointsOnboardingPublic = void 0;
const express_1 = require("express");
const upload_1 = require("../middleware/upload");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const onboarding_1 = require("../services/onboarding");
const argon2 = __importStar(require("argon2"));
exports.pointsOnboardingPublic = (0, express_1.Router)();
// Feature-flagged signature upload (disabled on free tier)
// Preload for the form (name, email, includeServices, sectorId; DO NOT expose status)
exports.pointsOnboardingPublic.get("/:token", async (req, res) => {
    const token = zod_1.z.string().min(10).parse(req.params.token);
    // Include the linked services with their service relation so we can expose names safely
    const ob = await prisma_1.prisma.pointOnboarding.findUnique({ where: { onboardingToken: token }, include: { services: { include: { service: true } }, sector: true } });
    if (!ob || ob.status !== "DRAFT" || (ob.tokenExpiresAt && ob.tokenExpiresAt < new Date()))
        return res.status(404).json({ error: "Not found" });
    const serviceIds = ob.services.map((s) => s.serviceId);
    const services = ob.services.map((s) => ({ id: s.serviceId, name: s.service?.name }));
    res.json({ name: ob.name, email: ob.email, includeServices: ob.includeServices, sector: { id: ob.sectorId, name: ob.sector?.name }, serviceIds, services });
});
// Submit details + signature + optional services
exports.pointsOnboardingPublic.post("/:token/submit", (0, upload_1.upload)(), async (req, res) => {
    if (process.env.UPLOADS_ENABLED !== "true") {
        // Still allow submission without signature when disabled
        // or you could return 503 similar to conventions route.
    }
    const token = zod_1.z.string().min(10).parse(req.params.token);
    // Parse form fields for validation
    const body = zod_1.z.object({
        vatOrTaxNumber: zod_1.z.string().min(2).optional(),
        phone: zod_1.z.string().min(5).optional(),
        // Note: services comes as "services[]" array from FormData
    }).safeParse(req.body);
    if (!body.success)
        return res.status(400).json({ error: "ValidationError", issues: body.error.issues });
    // Parse services array from form data (sent as "services[]")
    let services = [];
    if (req.body["services[]"]) {
        services = Array.isArray(req.body["services[]"])
            ? req.body["services[]"]
            : [req.body["services[]"]];
    }
    // Handle signature file from multipart upload
    let signatureData;
    if (process.env.UPLOADS_ENABLED === "true" && req.files) {
        // Find signature file in uploaded files
        const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
        const signatureFile = files.find((f) => f.fieldname === 'file' && f.mimetype?.startsWith('image/'));
        if (signatureFile) {
            try {
                // Use the same storage provider pattern as leads route
                const { storage } = await Promise.resolve().then(() => __importStar(require("../storage/provider")));
                const mime = signatureFile.mimetype?.toLowerCase() || "image/png";
                const stored = await storage.put({
                    buffer: signatureFile.buffer,
                    mime,
                    originalName: signatureFile.originalname,
                });
                signatureData = {
                    url: stored.path,
                    key: stored.uploadthingKey || stored.fileName,
                    originalName: signatureFile.originalname,
                    mime: stored.mime,
                };
            }
            catch (error) {
                console.error("Error uploading signature file:", error);
                return res.status(500).json({
                    message: "Signature upload failed",
                    error: error instanceof Error ? error.message : "Unknown error"
                });
            }
        }
    }
    await (0, onboarding_1.submitOnboardingForm)(token, {
        vatOrTaxNumber: body.data.vatOrTaxNumber,
        phone: body.data.phone,
        services: services.length > 0 ? services : undefined,
        signature: signatureData,
    });
    res.json({ ok: true });
});
// Registration page prefill
exports.pointsOnboardingPublic.get("/register/:regToken", async (req, res) => {
    const regToken = zod_1.z.string().min(10).parse(req.params.regToken);
    const ob = await prisma_1.prisma.pointOnboarding.findFirst({ where: { registrationToken: regToken } });
    if (!ob || ob.status !== "APPROVED" || (ob.tokenExpiresAt && ob.tokenExpiresAt < new Date()))
        return res.status(404).json({ error: "Not found" });
    res.json({ email: ob.email, name: ob.name, role: "GTC_POINT" });
});
// Set password and finish
exports.pointsOnboardingPublic.post("/register/:regToken", async (req, res) => {
    const regToken = zod_1.z.string().min(10).parse(req.params.regToken);
    const body = zod_1.z.object({ password: zod_1.z.string().min(8), confirm: zod_1.z.string().min(8) }).parse(req.body);
    if (body.password !== body.confirm)
        return res.status(400).json({ error: "Passwords do not match" });
    const hash = await argon2.hash(body.password);
    const user = await (0, onboarding_1.completeRegistration)(regToken, hash);
    res.json({ ok: true, userId: user.id });
});
exports.default = exports.pointsOnboardingPublic;
