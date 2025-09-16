"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminConventions = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../lib/prisma");
const conventions_1 = require("../services/conventions");
const node_path_1 = __importDefault(require("node:path"));
const promises_1 = __importDefault(require("node:fs/promises"));
const archiver_1 = __importDefault(require("archiver"));
const sanitize_filename_1 = __importDefault(require("sanitize-filename"));
exports.adminConventions = (0, express_1.Router)();
exports.adminConventions.use(auth_1.requireAuth, (0, auth_1.requireRole)("ADMIN"));
// list (basic filters)
exports.adminConventions.get("/", async (req, res) => {
    const status = req.query.status?.toUpperCase();
    const where = status ? { status: status } : {};
    const items = await prisma_1.prisma.convention.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { gtcPoint: true, sector: true, documents: { orderBy: { createdAt: "desc" } } },
        take: 200,
    });
    res.json({ items });
});
// decision (approve/decline, optional internalSalesRep)
const decisionSchema = zod_1.z.object({
    action: zod_1.z.enum(["APPROVE", "DECLINE"]),
    internalSalesRep: zod_1.z.string().min(1).optional(),
});
exports.adminConventions.patch("/:id", async (req, res) => {
    const { id } = zod_1.z.object({ id: zod_1.z.string().min(1) }).parse(req.params);
    const body = decisionSchema.safeParse(req.body);
    if (!body.success)
        return res.status(400).json({ error: "ValidationError", issues: body.error.issues });
    const approved = body.data.action === "APPROVE";
    const conv = await prisma_1.prisma.convention.update({
        where: { id },
        data: {
            status: approved ? "APPROVED" : "DECLINED",
            internalSalesRep: body.data.internalSalesRep,
        },
    });
    await (0, conventions_1.onConventionDecision)(conv.id, approved, body.data.internalSalesRep);
    res.json(conv);
});
// GET /api/admin/conventions/:id/archive → zip all documents for a convention (admin-only)
exports.adminConventions.get("/:id/archive", async (req, res) => {
    const { id } = zod_1.z.object({ id: zod_1.z.string().min(1) }).parse(req.params);
    // pull convention + docs (ordered newest first)
    const conv = await prisma_1.prisma.convention.findUnique({
        where: { id },
        include: { gtcPoint: true, sector: true, documents: { orderBy: { createdAt: "desc" } } },
    });
    if (!conv)
        return res.status(404).json({ error: "Convention not found" });
    // filename: convention-<id>-<point>-<sector>.zip (sanitized)
    const safePoint = (0, sanitize_filename_1.default)(conv.gtcPoint?.name ?? "point");
    const safeSector = (0, sanitize_filename_1.default)(conv.sector?.name ?? "sector");
    const zipName = `convention-${conv.id}-${safePoint}-${safeSector}.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);
    const archive = (0, archiver_1.default)("zip", { zlib: { level: 9 } });
    archive.on("error", (err) => {
        // terminate stream on error
        res.status(500).end();
    });
    archive.pipe(res);
    // add each existing file by absolute path; name inside zip = timestamp_kind_filename
    for (const d of conv.documents) {
        const absPath = node_path_1.default.resolve("uploads", "." + d.path); // mirrors your single-file download path
        try {
            await promises_1.default.access(absPath);
            const ts = new Date(d.createdAt).toISOString().replace(/[:T]/g, "-").slice(0, 19);
            const entryName = `${ts}_${d.kind}_${(0, sanitize_filename_1.default)(d.fileName)}`;
            archive.file(absPath, { name: entryName });
        }
        catch {
            // skip missing file (keeps export resilient)
        }
    }
    // finalize stream
    void archive.finalize();
});
