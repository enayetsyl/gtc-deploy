// apps/api/src/routes/health.ts
import { Router } from "express";
export const router = Router();
router.get("/", (_req, res) => res.json({ ok: true }));
