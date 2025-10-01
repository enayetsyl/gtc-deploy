"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdmins = getAdmins;
exports.getPointUsers = getPointUsers;
exports.getSectorOwners = getSectorOwners;
exports.onConventionCreated = onConventionCreated;
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
// Sector owners may be attached either via legacy user.sectorId or via the UserSector join table
async function getSectorOwners(sectorId) {
    const owners = await prisma_1.prisma.user.findMany({
        where: {
            role: "SECTOR_OWNER",
            OR: [{ sectorId }, { userSectors: { some: { sectorId } } }],
        },
        select: { id: true },
    });
    return owners.map((u) => u.id);
}
/** Notify sector owners when a new convention is created */
async function onConventionCreated(conventionId) {
    const c = await prisma_1.prisma.convention.findUnique({
        where: { id: conventionId },
        include: { gtcPoint: true, sector: true },
    });
    if (!c)
        return;
    const subject = `Nuova convenzione creata: ${c.gtcPoint.name} (${c.sector.name})`;
    const html = `<p>È stata creata una nuova convenzione.</p>
<p><b>Punto:</b> ${c.gtcPoint.name}<br/>
<b>Settore:</b> ${c.sector.name}<br/>
<b>ID Convenzione:</b> ${c.id}</p>`;
    const ownerIds = await getSectorOwners(c.sectorId);
    if (ownerIds.length) {
        await (0, notifications_1.notifyUsers)(ownerIds, {
            type: "GENERIC",
            subject,
            contentHtml: html,
        });
    }
}
async function onConventionUploaded(conventionId) {
    const c = await prisma_1.prisma.convention.findUnique({
        where: { id: conventionId },
        include: { gtcPoint: true, sector: true },
    });
    if (!c)
        return;
    const subject = `Convenzione caricata: ${c.gtcPoint.name} (${c.sector.name})`;
    const html = `<p>È stata caricata una convenzione firmata.</p>
<p><b>Punto:</b> ${c.gtcPoint.name}<br/>
<b>Settore:</b> ${c.sector.name}<br/>
<b>ID Convenzione:</b> ${c.id}</p>`;
    const adminIds = await getAdmins();
    await (0, notifications_1.notifyUsers)(adminIds, {
        type: "CONVENTION_UPLOADED",
        subject,
        contentHtml: html,
    });
    // Also notify sector owners
    const ownerIds = await getSectorOwners(c.sectorId);
    if (ownerIds.length) {
        await (0, notifications_1.notifyUsers)(ownerIds, {
            type: "CONVENTION_UPLOADED",
            subject,
            contentHtml: html,
        });
    }
}
async function onConventionDecision(conventionId, approved, internalSalesRep) {
    const c = await prisma_1.prisma.convention.findUnique({
        where: { id: conventionId },
        include: { gtcPoint: true, sector: true },
    });
    if (!c)
        return;
    const subject = `Convenzione ${approved ? "APPROVATA" : "RIFIUTATA"}: ${c.gtcPoint.name}`;
    const pointHtml = `<p>La tua convenzione è stata <b>${approved ? "APPROVATA" : "RIFIUTATA"}</b>.</p>
<p><b>ID Convenzione:</b> ${c.id}${internalSalesRep ? `<br/><b>Referente interno:</b> ${internalSalesRep}` : ""}</p>`;
    const ownerHtml = `<p>La convenzione per <b>${c.gtcPoint.name}</b> è stata <b>${approved ? "APPROVATA" : "RIFIUTATA"}</b>.</p>
<p><b>ID Convenzione:</b> ${c.id}${internalSalesRep ? `<br/><b>Referente interno:</b> ${internalSalesRep}` : ""}</p>`;
    const pointUsers = await getPointUsers(c.gtcPointId);
    await (0, notifications_1.notifyUsers)(pointUsers, {
        type: "CONVENTION_STATUS",
        subject,
        contentHtml: pointHtml,
    });
    // Also notify sector owners about the decision
    const ownerIds = await getSectorOwners(c.sectorId);
    if (ownerIds.length) {
        await (0, notifications_1.notifyUsers)(ownerIds, {
            type: "CONVENTION_STATUS",
            subject,
            contentHtml: ownerHtml,
        });
    }
}
