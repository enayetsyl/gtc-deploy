import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import path from "node:path";
import fs from "node:fs/promises";

export const leadFiles = Router();

/** GET /api/leads/:id/attachments/:attId/download  (ADMIN, SECTOR_OWNER, GTC_POINT) */
leadFiles.get("/:id/attachments/:attId/download", requireAuth, requireRole("ADMIN", "SECTOR_OWNER", "GTC_POINT"), async (req, res) => {
  const { id, attId } = req.params;

  const att = await prisma.leadAttachment.findUnique({
    where: { id: attId },
    include: { lead: true },
  });
  if (!att || att.leadId !== id) return res.status(404).json({ error: "Attachment not found" });

  if (req.user!.role !== "ADMIN") {
    // determine my sector
    let mySectorId: string | null = null;
    if (req.user!.role === "SECTOR_OWNER") {
      const me = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { sectorId: true } });
      mySectorId = me?.sectorId ?? null;
    } else {
      const me = await prisma.user.findUnique({ where: { id: req.user!.id }, include: { gtcPoint: true } });
      mySectorId = me?.gtcPoint?.sectorId ?? null;
    }
    if (!mySectorId || mySectorId !== att.lead.sectorId) {
      return res.status(403).json({ error: "Forbidden" });
    }
  }

  const abs = path.resolve("uploads", "." + att.path);
  try {
    await fs.access(abs);
  } catch {
    return res.status(410).json({ error: "File missing from storage" });
  }

  res.setHeader("Content-Type", att.mime);
  res.setHeader("Content-Disposition", `attachment; filename="${att.fileName}"`);
  res.sendFile(abs);
});
