"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminPointsOnboarding = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const onboarding_1 = require("../services/onboarding");
const prisma_1 = require("../lib/prisma");
exports.adminPointsOnboarding = (0, express_1.Router)();
exports.adminPointsOnboarding.use(auth_1.requireAuth);
// Admin-only: list onboarding
exports.adminPointsOnboarding.get("/", (0, auth_1.requireRole)("ADMIN"), async (req, res) => {
    const status = req.query.status ?? undefined;
    const where = {};
    if (status)
        where.status = status;
    const items = await prisma_1.prisma.pointOnboarding.findMany({ where, orderBy: { createdAt: "desc" }, include: { services: true, sector: true } });
    res.json({ items });
});
const createSchema = zod_1.z.object({
    sectorId: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    name: zod_1.z.string().min(2),
    includeServices: zod_1.z.boolean().default(false),
    serviceIds: zod_1.z.array(zod_1.z.string().min(1)).optional(),
});
// Create onboarding (allowed by ADMIN and GTC_POINT)
exports.adminPointsOnboarding.post("/", async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
    const ob = await (0, onboarding_1.createOnboardingLink)(parsed.data);
    res.status(201).json(ob);
});
// Admin-only: approve
exports.adminPointsOnboarding.post("/:id/approve", (0, auth_1.requireRole)("ADMIN"), async (req, res) => {
    const { id } = zod_1.z.object({ id: zod_1.z.string().min(1) }).parse(req.params);
    const result = await (0, onboarding_1.approveOnboarding)(id, req.user.id);
    res.json(result);
});
// Admin-only: decline
exports.adminPointsOnboarding.post("/:id/decline", (0, auth_1.requireRole)("ADMIN"), async (req, res) => {
    const { id } = zod_1.z.object({ id: zod_1.z.string().min(1) }).parse(req.params);
    await (0, onboarding_1.declineOnboarding)(id, req.user.id);
    res.json({ ok: true });
});
exports.default = exports.adminPointsOnboarding;
