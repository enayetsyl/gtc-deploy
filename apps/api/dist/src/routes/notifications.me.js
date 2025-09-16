"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meNotifications = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const zod_1 = require("zod");
exports.meNotifications = (0, express_1.Router)();
exports.meNotifications.use(auth_1.requireAuth);
// cursor pagination
exports.meNotifications.get("/", async (req, res) => {
    const take = Math.min(50, Math.max(1, Number(req.query.take ?? 20)));
    const cursor = req.query.cursor || undefined;
    const items = await prisma_1.prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = items.length > take;
    const sliced = hasMore ? items.slice(0, take) : items;
    const nextCursor = hasMore ? sliced[sliced.length - 1].id : null;
    res.json({ items: sliced, nextCursor });
});
exports.meNotifications.get("/unread-count", async (req, res) => {
    const count = await prisma_1.prisma.notification.count({
        where: { userId: req.user.id, read: false },
    });
    res.json({ unread: count });
});
exports.meNotifications.post("/:id/read", async (req, res) => {
    const { id } = zod_1.z.object({ id: zod_1.z.string().min(1) }).parse(req.params);
    // restrict update to notifications owned by the authenticated user
    const result = await prisma_1.prisma.notification.updateMany({
        where: { id, userId: req.user.id },
        data: { read: true },
    });
    if (result.count === 0) {
        return res.status(404).json({ error: "notification not found" });
    }
    // fetch and return the updated notification
    const notif = await prisma_1.prisma.notification.findUnique({ where: { id } });
    res.json(notif);
});
