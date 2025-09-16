"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onLeadCreated = onLeadCreated;
const prisma_1 = require("../lib/prisma");
const notifications_1 = require("./notifications");
/** Users with role SECTOR_OWNER for the sector */
async function getSectorOwners(sectorId) {
    const owners = await prisma_1.prisma.user.findMany({
        where: { role: "SECTOR_OWNER", sectorId },
        select: { id: true },
    });
    return owners.map((u) => u.id);
}
/** All GTC point users in the sector */
async function getSectorPointUsers(sectorId) {
    const points = await prisma_1.prisma.gtcPoint.findMany({
        where: { sectorId },
        select: { id: true },
    });
    const pointIds = points.map((p) => p.id);
    if (pointIds.length === 0)
        return [];
    const users = await prisma_1.prisma.user.findMany({
        where: { gtcPointId: { in: pointIds } },
        select: { id: true },
    });
    return users.map((u) => u.id);
}
/** Fan-out when a new public lead is submitted */
async function onLeadCreated(leadId) {
    const lead = await prisma_1.prisma.lead.findUnique({
        where: { id: leadId },
        include: { sector: true },
    });
    if (!lead)
        return;
    const subject = `New lead for ${lead.sector?.name ?? "Sector"}`;
    const html = `
    <p>A new lead has been submitted.</p>
    <p>
      <b>Name:</b> ${lead.name}<br/>
      ${lead.email ? `<b>Email:</b> ${lead.email}<br/>` : ""}
      ${lead.phone ? `<b>Phone:</b> ${lead.phone}<br/>` : ""}
      ${lead.message ? `<b>Message:</b> ${lead.message}<br/>` : ""}
      <b>Sector:</b> ${lead.sector?.name ?? lead.sectorId}<br/>
      <b>Lead ID:</b> ${lead.id}
    </p>
  `;
    const [owners, pointUsers] = await Promise.all([
        getSectorOwners(lead.sectorId),
        getSectorPointUsers(lead.sectorId),
    ]);
    const unique = Array.from(new Set([...owners, ...pointUsers]));
    if (unique.length) {
        await (0, notifications_1.notifyUsers)(unique, {
            type: "LEAD_NEW",
            subject,
            contentHtml: html,
        });
    }
}
