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
    // Find onboarding and return prefill. Historically invites could preselect services,
    // but invites are now sector-only. To support the frontend, return the sector's
    // available services (id+name) and keep includeServices=false for compatibility.
    const ob = await prisma_1.prisma.pointOnboarding.findUnique({ where: { onboardingToken: token }, include: { sector: true } });
    if (!ob || ob.status !== "DRAFT" || (ob.tokenExpiresAt && ob.tokenExpiresAt < new Date()))
        return res.status(404).json({ error: "Not found" });
    const services = await prisma_1.prisma.service.findMany({ where: { sectorId: ob.sectorId, active: true }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true } });
    res.json({
        name: ob.name,
        email: ob.email,
        includeServices: false,
        sector: { id: ob.sectorId, name: ob.sector?.name },
        serviceIds: [],
        services: services.map((s) => ({ id: s.id, name: s.name })),
    });
});
// Submit details + signature + optional services
exports.pointsOnboardingPublic.post("/:token/submit", (0, upload_1.upload)(), async (req, res) => {
    const token = zod_1.z.string().min(10).parse(req.params.token);
    // Validate agreement fields
    const body = zod_1.z
        .object({
        protocolNo: zod_1.z.string().optional(),
        conventionNo: zod_1.z.string().optional(),
        companyName: zod_1.z.string().optional(),
        taxCodeOrVat: zod_1.z.string().optional(),
        registeredCity: zod_1.z.string().optional(),
        registeredProvince: zod_1.z.string().optional(),
        registeredAddress: zod_1.z.string().optional(),
        legalRepresentative: zod_1.z.string().optional(),
        contactSurname: zod_1.z.string().optional(),
        contactName: zod_1.z.string().optional(),
        contactRole: zod_1.z.string().optional(),
        contactEmail: zod_1.z.string().email().optional(),
        pointEmail: zod_1.z.string().email().optional(),
        contactPhone: zod_1.z.string().optional(),
        // fields the frontend currently sends as top/bottom place/date; accept them as optional aliases
        placeSigned: zod_1.z.string().optional(),
        dateSigned: zod_1.z.string().optional(),
        topPlace: zod_1.z.string().optional(),
        topDate: zod_1.z.string().optional(),
        bottomPlace: zod_1.z.string().optional(),
        bottomDate: zod_1.z.string().optional(),
        agreedToArticles: zod_1.z.string().optional(), // checkbox comes as "on"
        // services[] will be parsed separately
    })
        .safeParse(req.body);
    if (!body.success)
        return res.status(400).json({ error: "ValidationError", issues: body.error.issues });
    // parse services[] from FormData
    let services = [];
    if (req.body["services[]"]) {
        services = Array.isArray(req.body["services[]"]) ? req.body["services[]"] : [req.body["services[]"]];
    }
    // Handle signature upload if present and uploads are enabled
    let signatureData;
    if (process.env.UPLOADS_ENABLED === "true" && req.files) {
        const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
        // Accept any uploaded image file as the signature (frontend may use different field names)
        const signatureFile = files.find((f) => f.mimetype?.startsWith("image/"));
        if (signatureFile) {
            try {
                const { storage } = await Promise.resolve().then(() => __importStar(require("../storage/provider")));
                const mime = signatureFile.mimetype?.toLowerCase() || "image/png";
                const stored = await storage.put({ buffer: signatureFile.buffer, mime, originalName: signatureFile.originalname });
                signatureData = { url: stored.path, key: stored.uploadthingKey || stored.fileName, originalName: signatureFile.originalname, mime: stored.mime };
            }
            catch (err) {
                console.error("Error uploading signature file:", err);
                return res.status(500).json({ error: "SignatureUploadFailed", details: err instanceof Error ? err.message : String(err) });
            }
        }
    }
    // Ensure the user explicitly agreed to articles
    const agreed = !!(body.data.agreedToArticles === "on" || body.data.agreedToArticles === "true" || body.data.agreedToArticles === "1");
    if (!agreed)
        return res.status(400).json({ error: "AgreementNotAccepted" });
    // Determine which place/date to use for the agreement signing moment. Prefer explicit placeSigned/dateSigned,
    // then topPlace/topDate (the frontend uses these names), then bottomPlace/bottomDate.
    const placeSigned = body.data.placeSigned ?? body.data.topPlace ?? body.data.bottomPlace ?? undefined;
    const dateSigned = body.data.dateSigned ?? body.data.topDate ?? body.data.bottomDate ?? undefined;
    await (0, onboarding_1.submitAgreement)(token, {
        protocolNo: body.data.protocolNo,
        conventionNo: body.data.conventionNo,
        companyName: body.data.companyName,
        taxCodeOrVat: body.data.taxCodeOrVat,
        registeredCity: body.data.registeredCity,
        registeredProvince: body.data.registeredProvince,
        registeredAddress: body.data.registeredAddress,
        legalRepresentative: body.data.legalRepresentative,
        contactSurname: body.data.contactSurname,
        contactName: body.data.contactName,
        contactRole: body.data.contactRole,
        pointEmail: body.data.pointEmail,
        contactEmail: body.data.contactEmail,
        contactPhone: body.data.contactPhone,
        placeSigned,
        dateSigned,
        services: services.length ? services : undefined,
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
