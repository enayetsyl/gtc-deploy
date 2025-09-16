"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminLeads = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
exports.adminLeads = (0, express_1.Router)();
exports.adminLeads.use(auth_1.requireAuth, (0, auth_1.requireRole)("ADMIN"));
/** GET /api/admin/leads?sectorId=&page=&pageSize= */
exports.adminLeads.get("/", async (req, res) => {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
    const sectorId = req.query.sectorId || undefined;
    const where = sectorId ? { sectorId } : {};
    const [items, total] = await Promise.all([
        prisma_1.prisma.lead.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: { sector: true, attachments: true },
        }),
        prisma_1.prisma.lead.count({ where }),
    ]);
    res.json({ items, total, page, pageSize });
});
