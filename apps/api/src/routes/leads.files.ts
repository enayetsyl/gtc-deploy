import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

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

  // With UploadThing, we redirect to the file URL instead of serving locally
  // The 'path' field now contains the UploadThing URL
  if (att.path.startsWith('http')) {
    // UploadThing URL - redirect to it
    return res.redirect(att.path);
  } else {
    // Legacy local file path - return 410 Gone
    return res.status(410).json({ error: "File no longer available - migrated to cloud storage" });
  }
});
