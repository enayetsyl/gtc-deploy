"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onServiceRequested = onServiceRequested;
exports.onServiceStatusChanged = onServiceStatusChanged;
const prisma_1 = require("../lib/prisma");
const notifications_1 = require("./notifications");
const conventions_1 = require("./conventions");
/** Point → request a service (notifies Admins) */
async function onServiceRequested(gtcPointId, serviceId) {
    const [point, service] = await Promise.all([
        prisma_1.prisma.gtcPoint.findUnique({ where: { id: gtcPointId }, include: { sector: true } }),
        prisma_1.prisma.service.findUnique({ where: { id: serviceId } }),
    ]);
    if (!point || !service)
        return;
    const subject = `Service request: ${service.name} from ${point.name}`;
    const html = `<p><b>Point:</b> ${point.name} / ${point.sector?.name ?? ""}<br/><b>Service:</b> ${service.name} (${service.code})</p>`;
    const admins = await (0, conventions_1.getAdmins)();
    await (0, notifications_1.notifyUsers)(admins, {
        type: "SERVICE_REQUEST",
        subject,
        contentHtml: html,
    });
}
/** Admin → enable/disable (notifies Point users) */
async function onServiceStatusChanged(gtcPointId, serviceId, status) {
    const [point, service] = await Promise.all([
        prisma_1.prisma.gtcPoint.findUnique({ where: { id: gtcPointId }, include: { sector: true } }),
        prisma_1.prisma.service.findUnique({ where: { id: serviceId } }),
    ]);
    if (!point || !service)
        return;
    const subject = `Service ${status === "ENABLED" ? "enabled" : "disabled"}: ${service.name}`;
    const html = `<p>Your service <b>${service.name}</b> has been <b>${status}</b>.</p>`;
    const users = await (0, conventions_1.getPointUsers)(gtcPointId);
    await (0, notifications_1.notifyUsers)(users, {
        type: "SERVICE_STATUS",
        subject,
        contentHtml: html,
    });
}
