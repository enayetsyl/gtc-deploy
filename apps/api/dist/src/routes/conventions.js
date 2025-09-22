"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.conventionsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
// Upload feature flag wrapper
const upload_1 = require("../middleware/upload");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../lib/prisma");
const provider_1 = require("../storage/provider");
const pdf_1 = require("../utils/pdf");
const conventions_1 = require("../services/conventions");
const mime_types_1 = require("mime-types");
const node_path_1 = __importDefault(require("node:path"));
const promises_1 = __importDefault(require("node:fs/promises"));
exports.conventionsRouter = (0, express_1.Router)();
exports.conventionsRouter.use(auth_1.requireAuth);
// 4.1 Create a convention (GTC point or admin)
const createSchema = zod_1.z.object({
    gtcPointId: zod_1.z.string().uuid().optional(), // admin may specify; point users derive from profile
    sectorId: zod_1.z.string().uuid().optional(), // admin may specify
});
exports.conventionsRouter.post("/", (0, auth_1.requireRole)("GTC_POINT", "ADMIN"), async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
    let { gtcPointId, sectorId } = parsed.data;
    // If GTC_POINT user, derive from their mapping
    if (req.user.role === "GTC_POINT") {
        const me = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            include: { gtcPoint: { include: { sector: true } } },
        });
        if (!me?.gtcPoint)
            return res.status(409).json({ error: "User is not attached to a GTC Point" });
        gtcPointId = me.gtcPoint.id;
        sectorId = me.gtcPoint.sectorId;
    }
    else {
        // admin path: both ids required
        if (!gtcPointId || !sectorId)
            return res.status(400).json({ error: "gtcPointId and sectorId are required for admin" });
    }
    const conv = await prisma_1.prisma.convention.create({
        data: { gtcPointId: gtcPointId, sectorId: sectorId, status: "NEW" },
    });
    res.status(201).json(conv);
});
// 4.2 Prefill PDF (no DB write) – return a flattened simple PDF
const prefillSchema = zod_1.z.object({
    applicantName: zod_1.z.string().min(1).optional(),
    pointName: zod_1.z.string().min(1).optional(),
    title: zod_1.z.string().min(1).optional(),
});
exports.conventionsRouter.post("/prefill", (0, auth_1.requireRole)("GTC_POINT", "ADMIN"), async (req, res) => {
    const parsed = prefillSchema.safeParse(req.body || {});
    if (!parsed.success)
        return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
    let pointName = parsed.data.pointName;
    if (!pointName && req.user.role === "GTC_POINT") {
        const me = await prisma_1.prisma.user.findUnique({ where: { id: req.user.id }, include: { gtcPoint: true } });
        pointName = me?.gtcPoint?.name || undefined;
    }
    const pdf = await (0, pdf_1.buildPrefillPdf)({ title: parsed.data.title, applicantName: parsed.data.applicantName, pointName });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="convention-prefill.pdf"`);
    res.send(pdf);
});
// 4.3 Upload signed convention file (feature-flagged). When UPLOADS_ENABLED!=='true', this becomes a no-op
exports.conventionsRouter.post("/:id/upload", (0, auth_1.requireRole)("GTC_POINT", "ADMIN"), (0, upload_1.upload)({ multiple: false, fieldName: "file" }), async (req, res) => {
    if (process.env.UPLOADS_ENABLED !== "true") {
        return res.status(503).json({ error: "UploadsDisabled", message: "File uploads are disabled on this deployment." });
    }
    const id = req.params.id;
    const conv = await prisma_1.prisma.convention.findUnique({ where: { id }, include: { gtcPoint: true, sector: true } });
    if (!conv)
        return res.status(404).json({ error: "Convention not found" });
    // GTC point can only upload to its own convention
    if (req.user.role === "GTC_POINT") {
        const belongs = await prisma_1.prisma.user.findFirst({
            where: { id: req.user.id, gtcPointId: conv.gtcPointId },
            select: { id: true },
        });
        if (!belongs)
            return res.status(403).json({ error: "Forbidden" });
    }
    const file = req.file;
    if (!file)
        return res.status(400).json({ error: "file is required (multipart/form-data)" });
    if (conv.status === "APPROVED" || conv.status === "DECLINED") {
        return res.status(409).json({ error: "Convention is finalized; uploads are locked" });
    }
    const was = conv.status;
    // PDF magic bytes: %PDF
    const b = file.buffer;
    const isPdfMagic = b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
    if (!isPdfMagic)
        return res.status(400).json({ error: "File does not look like a valid PDF" });
    const mime = file.mimetype || (0, mime_types_1.lookup)(file.originalname) || "application/octet-stream";
    if (!String(mime).startsWith("application/pdf")) {
        return res.status(400).json({ error: "Only PDF uploads are allowed" });
    }
    const stored = await provider_1.storage.put({ buffer: file.buffer, mime: String(mime), originalName: file.originalname });
    const { doc, statusChanged } = await prisma_1.prisma.$transaction(async (tx) => {
        const created = await tx.conventionDocument.create({
            data: {
                conventionId: conv.id,
                kind: "SIGNED",
                fileName: stored.fileName,
                path: stored.path,
                mime: stored.mime,
                size: stored.size,
                checksum: stored.checksum,
                uploadedById: req.user.id,
            },
        });
        let changed = false;
        if (was !== "UPLOADED") {
            await tx.convention.update({ where: { id: conv.id }, data: { status: "UPLOADED" } });
            changed = true;
        }
        return { doc: created, statusChanged: changed };
    });
    if (statusChanged) {
        await (0, conventions_1.onConventionUploaded)(conv.id);
    }
    res.status(201).json({ ok: true, document: doc, downloadUrl: `/uploads${stored.path}` });
});
// 4.4 List my conventions (point sees own, admin sees all)
exports.conventionsRouter.get("/", (0, auth_1.requireRole)("GTC_POINT", "ADMIN"), async (req, res) => {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
    const where = req.user.role === "ADMIN"
        ? {}
        : {
            gtcPoint: { users: { some: { id: req.user.id } } },
        };
    const [items, total] = await Promise.all([
        prisma_1.prisma.convention.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: { gtcPoint: true, sector: true, documents: { orderBy: { createdAt: "desc" } } },
        }),
        prisma_1.prisma.convention.count({ where }),
    ]);
    res.json({ items, total, page, pageSize });
});
// list documents for a convention
exports.conventionsRouter.get("/:id/documents", (0, auth_1.requireRole)("GTC_POINT", "ADMIN"), async (req, res) => {
    const id = req.params.id;
    const docConv = await prisma_1.prisma.convention.findUnique({
        where: { id },
        include: { gtcPoint: { include: { users: { select: { id: true } } } }, documents: true },
    });
    if (!docConv)
        return res.status(404).json({ error: "Convention not found" });
    if (req.user.role !== "ADMIN") {
        const allowed = docConv.gtcPoint.users.some((u) => u.id === req.user.id);
        if (!allowed)
            return res.status(403).json({ error: "Forbidden" });
    }
    res.json({ items: docConv.documents });
});
// download a single document (auth-checked)
exports.conventionsRouter.get("/:id/documents/:docId/download", (0, auth_1.requireRole)("GTC_POINT", "ADMIN"), async (req, res) => {
    const { id, docId } = req.params;
    const doc = await prisma_1.prisma.conventionDocument.findUnique({
        where: { id: docId },
        include: { convention: { include: { gtcPoint: { include: { users: { select: { id: true } } } } } } },
    });
    if (!doc || doc.conventionId !== id)
        return res.status(404).json({ error: "Document not found" });
    if (req.user.role !== "ADMIN") {
        const allowed = doc.convention.gtcPoint.users.some((u) => u.id === req.user.id);
        if (!allowed)
            return res.status(403).json({ error: "Forbidden" });
    }
    const absPath = node_path_1.default.resolve("uploads", "." + doc.path); // same folder you already use
    try {
        await promises_1.default.access(absPath);
    }
    catch {
        return res.status(410).json({ error: "File missing from storage" });
    }
    res.setHeader("Content-Type", doc.mime);
    res.setHeader("Content-Disposition", `attachment; filename="${doc.fileName}"`);
    res.sendFile(absPath);
});
