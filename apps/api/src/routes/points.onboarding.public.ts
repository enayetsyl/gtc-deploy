import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { submitOnboardingForm, completeRegistration } from "../services/onboarding";
import * as argon2 from "argon2";

export const pointsOnboardingPublic = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

// Preload for the form (name, email, includeServices, sectorId; DO NOT expose status)
pointsOnboardingPublic.get("/:token", async (req, res) => {
  const token = z.string().min(10).parse(req.params.token);
  const ob = await (prisma as any).pointOnboarding.findUnique({ where: { onboardingToken: token }, include: { services: true, sector: true } });
  if (!ob || ob.status !== "DRAFT" || (ob.tokenExpiresAt && ob.tokenExpiresAt < new Date())) return res.status(404).json({ error: "Not found" });
  res.json({ name: ob.name, email: ob.email, includeServices: ob.includeServices, sector: { id: ob.sectorId, name: ob.sector?.name }, serviceIds: ob.services.map((s: any) => s.serviceId) });
});

// Submit details + signature + optional services
pointsOnboardingPublic.post("/:token/submit", upload.single("signature"), async (req, res) => {
  const token = z.string().min(10).parse(req.params.token);
  const body = z.object({
    vatOrTaxNumber: z.string().min(2).optional(),
    phone: z.string().min(5).optional(),
    services: z.array(z.string().min(1)).optional(),
  }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "ValidationError", issues: body.error.issues });
  await submitOnboardingForm(token, {
    vatOrTaxNumber: body.data.vatOrTaxNumber,
    phone: body.data.phone,
    services: body.data.services,
    signature: req.file ? { buffer: req.file.buffer, mime: req.file.mimetype, originalName: req.file.originalname } : undefined,
  });
  res.json({ ok: true });
});

// Registration page prefill
pointsOnboardingPublic.get("/register/:regToken", async (req, res) => {
  const regToken = z.string().min(10).parse(req.params.regToken);
  const ob = await (prisma as any).pointOnboarding.findFirst({ where: { registrationToken: regToken } });
  if (!ob || ob.status !== "APPROVED" || (ob.tokenExpiresAt && ob.tokenExpiresAt < new Date())) return res.status(404).json({ error: "Not found" });
  res.json({ email: ob.email, name: ob.name, role: "GTC_POINT" });
});

// Set password and finish
pointsOnboardingPublic.post("/register/:regToken", async (req, res) => {
  const regToken = z.string().min(10).parse(req.params.regToken);
  const body = z.object({ password: z.string().min(8), confirm: z.string().min(8) }).parse(req.body);
  if (body.password !== body.confirm) return res.status(400).json({ error: "Passwords do not match" });
  const hash = await argon2.hash(body.password);
  const user = await completeRegistration(regToken, hash);
  res.json({ ok: true, userId: user.id });
});

export default pointsOnboardingPublic;
