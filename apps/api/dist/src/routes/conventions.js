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
const client_1 = require("@prisma/client");
const provider_1 = require("../storage/provider");
const pdf_1 = require("../utils/pdf");
const conventions_1 = require("../services/conventions");
const mime_types_1 = require("mime-types");
const node_path_1 = __importDefault(require("node:path"));
const promises_1 = __importDefault(require("node:fs/promises"));
exports.conventionsRouter = (0, express_1.Router)();
exports.conventionsRouter.use(auth_1.requireAuth);
// 4.1b Delete a convention (only allowed when status is NEW)
exports.conventionsRouter.delete("/:id", (0, auth_1.requireRole)("GTC_POINT", "ADMIN"), async (req, res) => {
    const id = req.params.id;
    const conv = await prisma_1.prisma.convention.findUnique({ include: { documents: true, gtcPoint: true }, where: { id } });
    if (!conv)
        return res.status(404).json({ error: "Convention not found" });
    // Only allow delete if NEW
    if (String(conv.status) !== "NEW")
        return res.status(409).json({ error: "Convention is finalized and cannot be deleted" });
    // Authorization: GTC_POINT may only delete their own convention
    if (req.user.role === "GTC_POINT") {
        const belongs = await prisma_1.prisma.user.findFirst({ where: { id: req.user.id, gtcPointId: conv.gtcPointId }, select: { id: true } });
        if (!belongs)
            return res.status(403).json({ error: "Forbidden" });
    }
    // Remove stored files if storage provider supports it - attempt best-effort
    for (const doc of conv.documents ?? []) {
        try {
            // If path looks like an UploadThing URL, some storage implementations store a key in path or uploadthingKey in other models.
            // The storage interface exposes remove(relPath) which UploadThingStorage expects a file key.
            if (doc.path) {
                // For legacy local-style paths this is a no-op for UploadThingStorage remove; best-effort.
                await provider_1.storage.remove(doc.path);
            }
        }
        catch (e) {
            // swallow - don't block deletion if file cleanup fails
            console.error("Failed to remove file for convention document", doc.id, e);
        }
    }
    // Remove convention documents and convention record in a transaction
    await prisma_1.prisma.$transaction(async (tx) => {
        await tx.conventionDocument.deleteMany({ where: { conventionId: id } });
        await tx.convention.delete({ where: { id } });
    });
    return res.status(204).end();
});
// 4.1 Create a convention (GTC point or admin)
const createSchema = zod_1.z.object({
    // DB uses cuid() for ids in this project; accept cuid() rather than uuid()
    gtcPointId: zod_1.z.string().cuid().optional(), // admin may specify; point users derive from profile
    sectorId: zod_1.z.string().cuid().optional(), // admin may specify
    serviceIds: zod_1.z.array(zod_1.z.string().cuid()).optional(), // optional list of services to request/enable
});
exports.conventionsRouter.post("/", (0, auth_1.requireRole)("GTC_POINT", "ADMIN"), async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    console.log('parsed', parsed);
    if (!parsed.success)
        return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
    let { gtcPointId, sectorId, serviceIds } = parsed.data;
    console.log('req.user', req.user);
    // If GTC_POINT user, derive from their mapping
    if (req.user.role === "GTC_POINT") {
        const me = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            include: { gtcPoint: { include: { sector: true } } },
        });
        if (!me?.gtcPoint)
            return res.status(409).json({ error: "User is not attached to a GTC Point" });
        gtcPointId = me.gtcPoint.id;
        // sectorId = me.gtcPoint.sectorId;
    }
    else {
        // admin path: both ids required
        if (!gtcPointId || !sectorId)
            return res.status(400).json({ error: "gtcPointId and sectorId are required for admin" });
    }
    // rely on Prisma schema default for `status` (ConventionStatus @default(NEW))
    const conv = await prisma_1.prisma.convention.create({
        data: { gtcPointId: gtcPointId, sectorId: sectorId },
    });
    // If serviceIds provided, create PENDING_REQUEST links for the point (ignore invalid for sector)
    if (serviceIds && serviceIds.length) {
        const valid = await prisma_1.prisma.service.findMany({ where: { id: { in: serviceIds }, sectorId: sectorId } });
        for (const svc of valid) {
            await prisma_1.prisma.gtcPointService.upsert({
                where: { gtcPointId_serviceId: { gtcPointId: gtcPointId, serviceId: svc.id } },
                update: { status: client_1.ServiceStatus.PENDING_REQUEST },
                create: { gtcPointId: gtcPointId, serviceId: svc.id, status: client_1.ServiceStatus.PENDING_REQUEST },
            });
        }
    }
    // Notify sector owners about the new convention
    try {
        await (0, conventions_1.onConventionCreated)(conv.id);
    }
    catch (e) {
        // non-blocking notification
    }
    res.status(201).json(conv);
});
// 4.2 Prefill PDF (no DB write) – return a flattened simple PDF
const prefillSchema = zod_1.z.object({
    applicantName: zod_1.z.string().min(1).optional(),
    pointName: zod_1.z.string().min(1).optional(),
    title: zod_1.z.string().min(1).optional(),
    sectorName: zod_1.z.string().min(1).optional(),
    services: zod_1.z.array(zod_1.z.string()).optional(),
    signature: zod_1.z.string().optional(), // Data URL (PNG) for embedding signature
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
    const pdf = await (0, pdf_1.buildPrefillPdf)({
        title: parsed.data.title,
        applicantName: parsed.data.applicantName,
        pointName,
        sectorName: parsed.data.sectorName,
        services: parsed.data.services,
        signatureDataUrl: parsed.data.signature,
    });
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
    // Allow optional multipart fields: sectorId and serviceIds
    const body = req.body || {};
    const providedSectorId = body.sectorId;
    let providedServiceIds;
    if (body.serviceIds) {
        try {
            if (typeof body.serviceIds === 'string')
                providedServiceIds = JSON.parse(body.serviceIds);
            else if (Array.isArray(body.serviceIds))
                providedServiceIds = body.serviceIds;
        }
        catch (e) {
            // ignore parse errors; leave undefined
        }
    }
    // Handle files from multer.any() - files are in req.files array. Accept up to 5 files.
    let files = [];
    if (req.files) {
        const all = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
        // prefer field name 'files' (new) but accept legacy 'file'
        files = all.filter((f) => f.fieldname === 'files' || f.fieldname === 'file');
    }
    if (!files.length)
        return res.status(400).json({ error: "file(s) are required (multipart/form-data)" });
    if (files.length > 5)
        return res.status(400).json({ error: "At most 5 files are allowed" });
    if (String(conv.status) === "APPROVED" || String(conv.status) === "DECLINED") {
        return res.status(409).json({ error: "Convention is finalized; uploads are locked" });
    }
    const was = String(conv.status);
    // PDF magic bytes: %PDF
    // Validate each file and store them. We'll process within a transaction when creating DB records.
    for (const f of files) {
        const b = f.buffer;
        const isPdfMagic = b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
        if (!isPdfMagic)
            return res.status(400).json({ error: `File ${f.originalname} does not look like a valid PDF` });
        const mime = f.mimetype || (0, mime_types_1.lookup)(f.originalname) || "application/octet-stream";
        if (!String(mime).startsWith("application/pdf")) {
            return res.status(400).json({ error: `Only PDF uploads are allowed (${f.originalname})` });
        }
    }
    // Store files first (outside the DB transaction) to avoid long network calls inside transactions
    const storedResults = [];
    try {
        for (const f of files) {
            const stored = await provider_1.storage.put({ buffer: f.buffer, mime: f.mimetype || (0, mime_types_1.lookup)(f.originalname) || "application/pdf", originalName: f.originalname });
            storedResults.push({ stored, file: f });
        }
    }
    catch (err) {
        // If storage.put fails for any file, attempt to remove any previously stored files then fail
        for (const r of storedResults) {
            try {
                if (r.stored && r.stored.path)
                    await provider_1.storage.remove(r.stored.path);
            }
            catch (e) {
                console.warn("Failed cleanup after storage error", e);
            }
        }
        console.error("Error storing files before DB transaction", err);
        return res.status(500).json({ error: "StorageError", message: "Failed to store uploaded files" });
    }
    // Now perform DB writes in a transaction using the stored results
    const { statusChanged } = await prisma_1.prisma.$transaction(async (tx) => {
        // If a sectorId was provided, validate it exists. For both admins and point users
        // we'll allow applying the provided sectorId but we validate the sector record exists.
        // This change intentionally permits GTC_POINT users to change the convention sector via upload.
        let newSectorId = undefined;
        if (providedSectorId) {
            const foundSector = await tx.sector.findUnique({ where: { id: providedSectorId } });
            if (!foundSector) {
                // invalid sector id, log and ignore
                console.warn(`Upload: provided sectorId ${providedSectorId} does not exist; ignoring`);
            }
            else {
                newSectorId = providedSectorId;
            }
        }
        // If serviceIds provided, validate they belong to the (provided or existing) sector
        let validServiceIds;
        if (providedServiceIds && providedServiceIds.length) {
            const sectorToCheck = newSectorId ?? conv.sectorId;
            const found = await tx.service.findMany({ where: { id: { in: providedServiceIds }, sectorId: sectorToCheck } });
            const foundIds = found.map((s) => s.id);
            // If some provided ids are invalid for the sector, log a warning and proceed with the valid ones
            const invalid = providedServiceIds.filter((id) => !foundIds.includes(id));
            if (invalid.length) {
                console.warn(`Upload: some provided serviceIds are invalid for sector ${sectorToCheck}: ${invalid.join(",")}`);
            }
            validServiceIds = foundIds.length ? foundIds : undefined;
        }
        let changed = false;
        // create document records for each previously-stored file
        for (const r of storedResults) {
            const stored = r.stored;
            await tx.conventionDocument.create({
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
        }
        // Update status to UPLOADED if needed
        if (was !== "UPLOADED") {
            // Some generated Prisma clients may not include all enum members in the runtime const object.
            // Use a literal cast here to avoid blocking the sweep; this can be tightened once the generated client is confirmed.
            await tx.convention.update({ where: { id: conv.id }, data: { status: "UPLOADED" } });
            changed = true;
        }
        // If we have a newSectorId different from existing, update the convention
        if (newSectorId && newSectorId !== conv.sectorId) {
            await tx.convention.update({ where: { id: conv.id }, data: { sectorId: newSectorId } });
        }
        // If serviceIds were provided, ensure the gtcPoint has corresponding GtcPointService links
        if (validServiceIds && validServiceIds.length) {
            // createMany with skipDuplicates to avoid unique constraint errors
            const links = validServiceIds.map((sid) => ({ gtcPointId: conv.gtcPointId, serviceId: sid }));
            try {
                await tx.gtcPointService.createMany({ data: links, skipDuplicates: true });
            }
            catch (e) {
                // ignore; createMany may not be supported by some providers - fall back to upsert loop
                for (const sid of validServiceIds) {
                    await tx.gtcPointService.upsert({
                        where: { id: `${conv.gtcPointId}-${sid}` },
                        create: { gtcPointId: conv.gtcPointId, serviceId: sid, status: client_1.ServiceStatus.ENABLED },
                        update: {},
                    }).catch(() => { });
                }
            }
        }
        return { statusChanged: changed };
    }, {
        maxWait: 10000, // 10 seconds
        timeout: 15000, // 15 seconds
    });
    if (statusChanged) {
        await (0, conventions_1.onConventionUploaded)(conv.id);
    }
    // respond with list of created documents (we didn't capture createdDoc objects above, re-query latest docs)
    const createdDocs = await prisma_1.prisma.conventionDocument.findMany({ where: { conventionId: conv.id }, orderBy: { createdAt: "desc" }, take: storedResults.length });
    res.status(201).json({ ok: true, documents: createdDocs, downloadUrl: storedResults.length ? `/uploads${storedResults[0].stored.path}` : undefined });
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
// 4.3b Create a convention and upload signed PDF in a single request
// Accepts multipart/form-data with fields: sectorId, serviceIds (optional, JSON array or repeated fields), optional gtcPointId (admin)
exports.conventionsRouter.post("/with-upload", (0, auth_1.requireRole)("GTC_POINT", "ADMIN"), (0, upload_1.upload)({ multiple: false, fieldName: "file" }), async (req, res) => {
    if (process.env.UPLOADS_ENABLED !== "true") {
        return res.status(503).json({ error: "UploadsDisabled", message: "File uploads are disabled on this deployment." });
    }
    const body = req.body || {};
    // sectorId may be provided; for GTC_POINT derive from profile
    let sectorId = body.sectorId;
    let gtcPointId = body.gtcPointId;
    if (req.user.role === "GTC_POINT") {
        const me = await prisma_1.prisma.user.findUnique({ where: { id: req.user.id }, include: { gtcPoint: { include: { sector: true } } } });
        if (!me?.gtcPoint)
            return res.status(409).json({ error: "User is not attached to a GTC Point" });
        gtcPointId = me.gtcPoint.id;
        sectorId = me.gtcPoint.sectorId;
    }
    else {
        // admin must provide gtcPointId and sectorId
        if (!gtcPointId || !sectorId)
            return res.status(400).json({ error: "gtcPointId and sectorId are required for admin" });
    }
    // files from multer - accept multiple
    let files = [];
    if (req.files) {
        const all = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
        files = all.filter((f) => f.fieldname === 'files' || f.fieldname === 'file');
    }
    if (!files.length)
        return res.status(400).json({ error: "file(s) are required (multipart/form-data)" });
    if (files.length > 5)
        return res.status(400).json({ error: "At most 5 files are allowed" });
    for (const file of files) {
        const b = file.buffer;
        const isPdfMagic = b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
        if (!isPdfMagic)
            return res.status(400).json({ error: `File ${file.originalname} does not look like a valid PDF` });
        const mime = file.mimetype || "application/pdf";
        if (!String(mime).startsWith("application/pdf"))
            return res.status(400).json({ error: `Only PDF uploads are allowed (${file.originalname})` });
    }
    // parse serviceIds if present (allow JSON string or repeated fields)
    let serviceIds;
    if (body.serviceIds) {
        try {
            if (typeof body.serviceIds === 'string') {
                // try JSON parse
                serviceIds = JSON.parse(body.serviceIds);
            }
            else if (Array.isArray(body.serviceIds)) {
                serviceIds = body.serviceIds;
            }
        }
        catch (e) {
            // ignore parse errors
        }
    }
    // store files first (avoid long network work in transaction)
    const storedResults = [];
    try {
        for (const file of files) {
            const stored = await provider_1.storage.put({ buffer: file.buffer, mime: file.mimetype || "application/pdf", originalName: file.originalname });
            storedResults.push({ stored, file });
        }
    }
    catch (err) {
        for (const r of storedResults) {
            try {
                if (r.stored && r.stored.path)
                    await provider_1.storage.remove(r.stored.path);
            }
            catch (e) {
                console.warn("Failed cleanup after storage error", e);
            }
        }
        console.error("Error storing files before DB transaction (with-upload)", err);
        return res.status(500).json({ error: "StorageError", message: "Failed to store uploaded files" });
    }
    // create convention and documents in transaction
    const { conv } = await prisma_1.prisma.$transaction(async (tx) => {
        const createdConv = await tx.convention.create({ data: { gtcPointId: gtcPointId, sectorId: sectorId, status: "UPLOADED" } });
        for (const r of storedResults) {
            const stored = r.stored;
            await tx.conventionDocument.create({
                data: {
                    conventionId: createdConv.id,
                    kind: "SIGNED",
                    fileName: stored.fileName,
                    path: stored.path,
                    mime: stored.mime,
                    size: stored.size,
                    checksum: stored.checksum,
                    uploadedById: req.user.id,
                },
            });
        }
        return { conv: createdConv };
    });
    try {
        await (0, conventions_1.onConventionCreated)(conv.id);
    }
    catch (e) { }
    try {
        await (0, conventions_1.onConventionUploaded)(conv.id);
    }
    catch (e) { }
    const createdDocs = await prisma_1.prisma.conventionDocument.findMany({ where: { conventionId: conv.id }, orderBy: { createdAt: "desc" }, take: storedResults.length });
    res.status(201).json({ ok: true, convention: conv, documents: createdDocs });
});
