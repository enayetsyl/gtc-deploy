"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meRouter = void 0;
// src/routes/me.ts
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../lib/prisma");
exports.meRouter = (0, express_1.Router)();
exports.meRouter.get("/", auth_1.requireAuth, async (req, res) => {
    const me = await prisma_1.prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    if (!me)
        return res.status(404).json({ error: "Not found" });
    return res.json(me);
});
