import { Router, Request, Response } from "express";
import { upload as flaggedUpload } from "../middleware/upload";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { submitOnboardingForm, completeRegistration } from "../services/onboarding";
import * as argon2 from "argon2";

export const pointsOnboardingPublic = Router();
// Feature-flagged signature upload (disabled on free tier)

// Preload for the form (name, email, includeServices, sectorId; DO NOT expose status)
pointsOnboardingPublic.get("/:token", async (req: Request, res: Response) => {
  const token = z.string().min(10).parse(req.params.token);
  const ob = await (prisma as any).pointOnboarding.findUnique({ where: { onboardingToken: token }, include: { services: true, sector: true } });
  if (!ob || ob.status !== "DRAFT" || (ob.tokenExpiresAt && ob.tokenExpiresAt < new Date())) return res.status(404).json({ error: "Not found" });
  res.json({ name: ob.name, email: ob.email, includeServices: ob.includeServices, sector: { id: ob.sectorId, name: ob.sector?.name }, serviceIds: ob.services.map((s: any) => s.serviceId) });
});

// Submit details + signature + optional services
pointsOnboardingPublic.post("/:token/submit", flaggedUpload(), async (req: Request, res: Response) => {
  if (process.env.UPLOADS_ENABLED !== "true") {
    // Still allow submission without signature when disabled
    // or you could return 503 similar to conventions route.
  }
  const token = z.string().min(10).parse(req.params.token);

  // Parse form fields for validation
  const body = z.object({
    vatOrTaxNumber: z.string().min(2).optional(),
    phone: z.string().min(5).optional(),
    // Note: services comes as "services[]" array from FormData
  }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "ValidationError", issues: body.error.issues });

  // Parse services array from form data (sent as "services[]")
  let services: string[] = [];
  if (req.body["services[]"]) {
    services = Array.isArray(req.body["services[]"])
      ? req.body["services[]"]
      : [req.body["services[]"]];
  }

  // Handle signature file from multipart upload
  let signatureData: { url: string; key: string; originalName: string; mime: string } | undefined;

  if (process.env.UPLOADS_ENABLED === "true" && req.files) {
    // Find signature file in uploaded files
    const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    const signatureFile = files.find((f: any) => f.fieldname === 'file' && f.mimetype?.startsWith('image/'));

    if (signatureFile) {
      try {
        // Use the same storage provider pattern as leads route
        const { storage } = await import("../storage/provider");

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
      } catch (error) {
        console.error("Error uploading signature file:", error);
        return res.status(500).json({
          message: "Signature upload failed",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  }

  await submitOnboardingForm(token, {
    vatOrTaxNumber: body.data.vatOrTaxNumber,
    phone: body.data.phone,
    services: services.length > 0 ? services : undefined,
    signature: signatureData,
  });
  res.json({ ok: true });
});

// Registration page prefill
pointsOnboardingPublic.get("/register/:regToken", async (req: Request, res: Response) => {
  const regToken = z.string().min(10).parse(req.params.regToken);
  const ob = await (prisma as any).pointOnboarding.findFirst({ where: { registrationToken: regToken } });
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
