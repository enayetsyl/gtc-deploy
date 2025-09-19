import { prisma } from "../lib/prisma";
import { notifyUsers } from "./notifications";
import { enqueueEmail } from "../queues/email";

/** Users with role SECTOR_OWNER for the sector.
 *
 * Owners can be assigned in two ways in this schema:
 *  - via the `user.sectorId` field (legacy / simple)
 *  - via the many-to-many `UserSector` join table
 *
 * We include both so all owners receive notifications.
 */
async function getSectorOwners(sectorId: string) {
  const owners = await prisma.user.findMany({
    where: {
      role: "SECTOR_OWNER" as any,
      OR: [{ sectorId }, { userSectors: { some: { sectorId } } }],
    },
    select: { id: true },
  });
  return owners.map((u) => u.id);
}

/** All GTC point users in the sector */
async function getSectorPointUsers(sectorId: string) {
  const points = await prisma.gtcPoint.findMany({
    where: { sectorId },
    select: { id: true },
  });
  const pointIds = points.map((p) => p.id);
  if (pointIds.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { gtcPointId: { in: pointIds } },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

/** Fan-out when a new public lead is submitted */
export async function onLeadCreated(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { sector: true },
  });
  if (!lead) return;

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



  const userIds = Array.from(new Set([...owners, ...pointUsers]));

  // Build a deduped list of email addresses: users' emails + gtc point emails
  const [usersWithEmails, points] = await Promise.all([
    userIds.length
      ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { email: true } })
      : Promise.resolve([] as { email: string | null }[]),
    prisma.gtcPoint.findMany({ where: { sectorId: lead.sectorId }, select: { email: true } }),
  ]);

  const emails = new Set<string>();
  for (const u of usersWithEmails) if (u.email) emails.add(u.email);
  for (const p of points) if (p.email) emails.add(p.email);

  // Create in-app notifications and socket emits for all relevant users but
  // disable per-user email sending (we'll send a single combined email below)
  if (userIds.length) {
    await notifyUsers(userIds, {
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
      // enqueue one job per address to avoid mailing list filtering and to
      // keep recipients private (one-to-one sends)
      await enqueueEmail({ to: addr, subject, html });
    }
  }
}
