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
    const ob = await prisma_1.prisma.pointOnboarding.findUnique({ where: { onboardingToken: token }, include: { services: true, sector: true } });
    if (!ob || ob.status !== "DRAFT" || (ob.tokenExpiresAt && ob.tokenExpiresAt < new Date()))
        return res.status(404).json({ error: "Not found" });
    res.json({ name: ob.name, email: ob.email, includeServices: ob.includeServices, sector: { id: ob.sectorId, name: ob.sector?.name }, serviceIds: ob.services.map((s) => s.serviceId) });
});
// Submit details + signature + optional services
exports.pointsOnboardingPublic.post("/:token/submit", (0, upload_1.upload)({ fieldName: "signature" }), async (req, res) => {
    if (process.env.UPLOADS_ENABLED !== "true") {
        // Still allow submission without signature when disabled
        // or you could return 503 similar to conventions route.
    }
    const token = zod_1.z.string().min(10).parse(req.params.token);
    const body = zod_1.z.object({
        vatOrTaxNumber: zod_1.z.string().min(2).optional(),
        phone: zod_1.z.string().min(5).optional(),
        services: zod_1.z.array(zod_1.z.string().min(1)).optional(),
    }).safeParse(req.body);
    if (!body.success)
        return res.status(400).json({ error: "ValidationError", issues: body.error.issues });
    await (0, onboarding_1.submitOnboardingForm)(token, {
        vatOrTaxNumber: body.data.vatOrTaxNumber,
        phone: body.data.phone,
        services: body.data.services,
        signature: req.file ? { buffer: req.file.buffer, mime: req.file.mimetype, originalName: req.file.originalname } : undefined,
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
