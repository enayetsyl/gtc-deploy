"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyUser = notifyUser;
exports.notifyUsers = notifyUsers;
const prisma_1 = require("../lib/prisma");
const io_1 = require("../sockets/io");
const email_1 = require("../queues/email");
/**
 * Creates a Notification row, emits socket events, and optionally enqueues an email.
 * Returns the created Notification.
 */
async function notifyUser(input) {
    const notif = await prisma_1.prisma.notification.create({
        data: {
            userId: input.userId,
            type: (input.type ?? "GENERIC"),
            subject: input.subject,
            contentHtml: input.contentHtml,
        },
    });
    // realtime: push to user room + badge update
    (0, io_1.emitToUser)(input.userId, "notify:new", notif);
    const unread = await prisma_1.prisma.notification.count({
        where: { userId: input.userId, read: false },
    });
    (0, io_1.emitToUser)(input.userId, "badge:update", { unread });
    // optional email
    if (input.email !== false) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: input.userId },
            select: { email: true },
        });
        if (user?.email) {
            await (0, email_1.enqueueEmail)({
                to: input.email?.to ?? user.email,
                subject: input.email?.subject ?? input.subject,
                html: input.email?.html ?? input.contentHtml,
                text: input.email?.text,
            });
        }
    }
    return notif;
}
async function notifyUsers(userIds, data) {
    return Promise.all(userIds.map((userId) => notifyUser({ ...data, userId })));
}
