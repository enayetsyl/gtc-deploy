import { Router, Request, Response } from "express";
import { upload as flaggedUpload } from "../middleware/upload";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { submitOnboardingForm, submitAgreement, completeRegistration } from "../services/onboarding";
import * as argon2 from "argon2";

export const pointsOnboardingPublic = Router();
// Feature-flagged signature upload (disabled on free tier)

// Preload for the form (name, email, includeServices, sectorId; DO NOT expose status)
pointsOnboardingPublic.get("/:token", async (req: Request, res: Response) => {
  const token = z.string().min(10).parse(req.params.token);
  // Find onboarding and return prefill. Historically invites could preselect services,
  // but invites are now sector-only. To support the frontend, return the sector's
  // available services (id+name) and keep includeServices=false for compatibility.
  const ob = await prisma.pointOnboarding.findUnique({ where: { onboardingToken: token }, include: { sector: true } });
  if (!ob || ob.status !== "DRAFT" || (ob.tokenExpiresAt && ob.tokenExpiresAt < new Date())) return res.status(404).json({ error: "Not found" });

  const services = await prisma.service.findMany({ where: { sectorId: ob.sectorId, active: true }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true } });

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
pointsOnboardingPublic.post("/:token/submit", flaggedUpload(), async (req: Request, res: Response) => {
  const token = z.string().min(10).parse(req.params.token);

  // Validate agreement fields
  const body = z
    .object({
      protocolNo: z.string().optional(),
      conventionNo: z.string().optional(),
      companyName: z.string().optional(),
      taxCodeOrVat: z.string().optional(),
      registeredCity: z.string().optional(),
      registeredProvince: z.string().optional(),
      registeredAddress: z.string().optional(),
      legalRepresentative: z.string().optional(),
      contactSurname: z.string().optional(),
      contactName: z.string().optional(),
      contactRole: z.string().optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
      placeSigned: z.string().optional(),
      dateSigned: z.string().optional(),
      agreedToArticles: z.string().optional(), // checkbox comes as "on"
      // services[] will be parsed separately
    })
    .safeParse(req.body);

  if (!body.success) return res.status(400).json({ error: "ValidationError", issues: body.error.issues });

  // parse services[] from FormData
  let services: string[] = [];
  if (req.body["services[]"]) {
    services = Array.isArray(req.body["services[]"]) ? req.body["services[]"] : [req.body["services[]"]];
  }

  // Handle signature upload if present and uploads are enabled
  let signatureData: { url: string; key: string; originalName: string; mime: string } | undefined;
  if (process.env.UPLOADS_ENABLED === "true" && req.files) {
    const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    const signatureFile = files.find((f: any) => f.fieldname === "file" && f.mimetype?.startsWith("image/"));
    if (signatureFile) {
      try {
        const { storage } = await import("../storage/provider");
        const mime = signatureFile.mimetype?.toLowerCase() || "image/png";
        const stored = await storage.put({ buffer: signatureFile.buffer, mime, originalName: signatureFile.originalname });
        signatureData = { url: stored.path, key: stored.uploadthingKey || stored.fileName, originalName: signatureFile.originalname, mime: stored.mime };
      } catch (err) {
        console.error("Error uploading signature file:", err);
        return res.status(500).json({ error: "SignatureUploadFailed", details: err instanceof Error ? err.message : String(err) });
      }
    }
  }

  // Ensure the user explicitly agreed to articles
  const agreed = !!(body.data.agreedToArticles === "on" || body.data.agreedToArticles === "true" || body.data.agreedToArticles === "1");
  if (!agreed) return res.status(400).json({ error: "AgreementNotAccepted" });

  await submitAgreement(token, {
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
    contactEmail: body.data.contactEmail,
    contactPhone: body.data.contactPhone,
    placeSigned: body.data.placeSigned,
    dateSigned: body.data.dateSigned,
    services: services.length ? services : undefined,
    signature: signatureData,
  });

  res.json({ ok: true });
});

// Registration page prefill
pointsOnboardingPublic.get("/register/:regToken", async (req: Request, res: Response) => {
  const regToken = z.string().min(10).parse(req.params.regToken);
  const ob = await prisma.pointOnboarding.findFirst({ where: { registrationToken: regToken } });
  if (!ob || ob.status !== "APPROVED" || (ob.tokenExpiresAt && ob.tokenExpiresAt < new Date())) return res.status(404).json({ error: "Not found" });
  res.json({ email: ob.email, name: ob.name, role: "GTC_POINT" });
});

// Set password and finish
pointsOnboardingPublic.post("/register/:regToken", async (req: Request, res: Response) => {
  const regToken = z.string().min(10).parse(req.params.regToken);
  const body = z.object({ password: z.string().min(8), confirm: z.string().min(8) }).parse(req.body);
  if (body.password !== body.confirm) return res.status(400).json({ error: "Passwords do not match" });
  const hash = await argon2.hash(body.password);
  const user = await completeRegistration(regToken, hash);
  res.json({ ok: true, userId: user.id });
});

export default pointsOnboardingPublic;
