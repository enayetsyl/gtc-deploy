"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onLeadCreated = onLeadCreated;
const prisma_1 = require("../lib/prisma");
const notifications_1 = require("./notifications");
const mailer_1 = require("../lib/mailer");
/** Users with role SECTOR_OWNER for the sector.
 *
 * Owners can be assigned in two ways in this schema:
 *  - via the `user.sectorId` field (legacy / simple)
 *  - via the many-to-many `UserSector` join table
 *
 * We include both so all owners receive notifications.
 */
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
    const subject = `Nuova richiesta per ${lead.sector?.name ?? "Settore"}`;
    const html = `
    <p>È stata inviata una nuova richiesta (lead).</p>
    <p>
      <b>Nome:</b> ${lead.name}<br/>
      ${lead.email ? `<b>Email:</b> ${lead.email}<br/>` : ""}
      ${lead.phone ? `<b>Telefono:</b> ${lead.phone}<br/>` : ""}
      ${lead.message ? `<b>Messaggio:</b> ${lead.message}<br/>` : ""}
      <b>Settore:</b> ${lead.sector?.name ?? lead.sectorId}<br/>
      <b>ID Lead:</b> ${lead.id}
    </p>
  `;
    const [owners, pointUsers] = await Promise.all([
        getSectorOwners(lead.sectorId),
        getSectorPointUsers(lead.sectorId),
    ]);
    const userIds = Array.from(new Set([...owners, ...pointUsers]));
    // Build a deduped list of email addresses: users' emails + gtc point emails
    const [usersWithEmails, points] = await Promise.all([
        userIds.length
            ? prisma_1.prisma.user.findMany({ where: { id: { in: userIds } }, select: { email: true } })
            : Promise.resolve([]),
        prisma_1.prisma.gtcPoint.findMany({ where: { sectorId: lead.sectorId }, select: { email: true } }),
    ]);
    const emails = new Set();
    for (const u of usersWithEmails)
        if (u.email)
            emails.add(u.email);
    for (const p of points)
        if (p.email)
            emails.add(p.email);
    // Create in-app notifications and socket emits for all relevant users but
    // disable per-user email sending (we'll send a single combined email below)
    if (userIds.length) {
        await (0, notifications_1.notifyUsers)(userIds, {
            type: "LEAD_NEW",
            subject,
            contentHtml: html,
            email: false,
        });
    }
    // Enqueue one email job per recipient so each GTC point receives its own send
    const to = Array.from(emails);
    if (to.length) {
        // debug log so we can see who's being emailed in server logs
        for (const addr of to) {
            // send one email per address to avoid mailing list filtering and to
            // keep recipients private (one-to-one sends)
            await (0, mailer_1.sendEmail)({ to: addr, subject, html });
        }
    }
}
