"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sectorsPublic = void 0;
// apps/api/src/routes/sectors.public.ts
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
exports.sectorsPublic = (0, express_1.Router)();
/**
 * GET /api/sectors/public
 * Public, minimal list for dropdowns (no auth)
 * Response: [{ id, name }, ...] sorted by name
 */
exports.sectorsPublic.get("/", async (_req, res) => {
    const items = await prisma_1.prisma.sector.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
    });
    res.json(items);
});
