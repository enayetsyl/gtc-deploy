"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadFiles = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const node_path_1 = __importDefault(require("node:path"));
const promises_1 = __importDefault(require("node:fs/promises"));
exports.leadFiles = (0, express_1.Router)();
/** GET /api/leads/:id/attachments/:attId/download  (ADMIN, SECTOR_OWNER, GTC_POINT) */
exports.leadFiles.get("/:id/attachments/:attId/download", auth_1.requireAuth, (0, auth_1.requireRole)("ADMIN", "SECTOR_OWNER", "GTC_POINT"), async (req, res) => {
    const { id, attId } = req.params;
    const att = await prisma_1.prisma.leadAttachment.findUnique({
        where: { id: attId },
        include: { lead: true },
    });
    if (!att || att.leadId !== id)
        return res.status(404).json({ error: "Attachment not found" });
    if (req.user.role !== "ADMIN") {
        // determine my sector
        let mySectorId = null;
        if (req.user.role === "SECTOR_OWNER") {
            const me = await prisma_1.prisma.user.findUnique({ where: { id: req.user.id }, select: { sectorId: true } });
            mySectorId = me?.sectorId ?? null;
        }
        else {
            const me = await prisma_1.prisma.user.findUnique({ where: { id: req.user.id }, include: { gtcPoint: true } });
            mySectorId = me?.gtcPoint?.sectorId ?? null;
        }
        if (!mySectorId || mySectorId !== att.lead.sectorId) {
            return res.status(403).json({ error: "Forbidden" });
        }
    }
    const abs = node_path_1.default.resolve("uploads", "." + att.path);
    try {
        await promises_1.default.access(abs);
    }
    catch {
        return res.status(410).json({ error: "File missing from storage" });
    }
    res.setHeader("Content-Type", att.mime);
    res.setHeader("Content-Disposition", `attachment; filename="${att.fileName}"`);
    res.sendFile(abs);
});
