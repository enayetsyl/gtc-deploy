"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdmins = getAdmins;
exports.getPointUsers = getPointUsers;
exports.onConventionUploaded = onConventionUploaded;
exports.onConventionDecision = onConventionDecision;
const prisma_1 = require("../lib/prisma");
const notifications_1 = require("./notifications");
async function getAdmins() {
    const admins = await prisma_1.prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, email: true } });
    return admins.map((a) => a.id);
}
async function getPointUsers(gtcPointId) {
    const users = await prisma_1.prisma.user.findMany({ where: { gtcPointId }, select: { id: true } });
    return users.map((u) => u.id);
}
async function onConventionUploaded(conventionId) {
    const c = await prisma_1.prisma.convention.findUnique({
        where: { id: conventionId },
        include: { gtcPoint: true, sector: true },
    });
    if (!c)
        return;
    const subject = `Convention uploaded: ${c.gtcPoint.name} (${c.sector.name})`;
    const html = `<p>A new signed convention was uploaded.</p>
<p><b>Point:</b> ${c.gtcPoint.name}<br/>
<b>Sector:</b> ${c.sector.name}<br/>
<b>Convention ID:</b> ${c.id}</p>`;
    const adminIds = await getAdmins();
    await (0, notifications_1.notifyUsers)(adminIds, {
        type: "CONVENTION_UPLOADED",
        subject,
        contentHtml: html,
    });
}
async function onConventionDecision(conventionId, approved, internalSalesRep) {
    const c = await prisma_1.prisma.convention.findUnique({
        where: { id: conventionId },
        include: { gtcPoint: true, sector: true },
    });
    if (!c)
        return;
    const subject = `Convention ${approved ? "APPROVED" : "DECLINED"}: ${c.gtcPoint.name}`;
    const html = `<p>Your convention has been <b>${approved ? "APPROVED" : "DECLINED"}</b>.</p>
<p><b>Convention ID:</b> ${c.id}${internalSalesRep ? `<br/><b>Internal Sales Rep:</b> ${internalSalesRep}` : ""}</p>`;
    const pointUsers = await getPointUsers(c.gtcPointId);
    await (0, notifications_1.notifyUsers)(pointUsers, {
        type: "CONVENTION_STATUS",
        subject,
        contentHtml: html,
    });
}
