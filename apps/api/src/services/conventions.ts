import { prisma } from "../lib/prisma";
import { notifyUser, notifyUsers } from "./notifications";

export async function getAdmins() {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" as any }, select: { id: true, email: true } });
  return admins.map((a: { id: string }) => a.id);
}

export async function getPointUsers(gtcPointId: string) {
  const users = await prisma.user.findMany({ where: { gtcPointId }, select: { id: true } });
  return users.map((u: { id: string }) => u.id);
}

export async function onConventionUploaded(conventionId: string) {
  const c = await prisma.convention.findUnique({
    where: { id: conventionId },
    include: { gtcPoint: true, sector: true },
  });
  if (!c) return;

  const subject = `Convention uploaded: ${c.gtcPoint.name} (${c.sector.name})`;
  const html = `<p>A new signed convention was uploaded.</p>
<p><b>Point:</b> ${c.gtcPoint.name}<br/>
<b>Sector:</b> ${c.sector.name}<br/>
<b>Convention ID:</b> ${c.id}</p>`;

  const adminIds = await getAdmins();
  await notifyUsers(adminIds, {
    type: "CONVENTION_UPLOADED",
    subject,
    contentHtml: html,
  });
}

export async function onConventionDecision(conventionId: string, approved: boolean, internalSalesRep?: string) {
  const c = await prisma.convention.findUnique({
    where: { id: conventionId },
    include: { gtcPoint: true, sector: true },
  });
  if (!c) return;

  const subject = `Convention ${approved ? "APPROVED" : "DECLINED"}: ${c.gtcPoint.name}`;
  const html = `<p>Your convention has been <b>${approved ? "APPROVED" : "DECLINED"}</b>.</p>
<p><b>Convention ID:</b> ${c.id}${internalSalesRep ? `<br/><b>Internal Sales Rep:</b> ${internalSalesRep}` : ""}</p>`;

  const pointUsers = await getPointUsers(c.gtcPointId);
  await notifyUsers(pointUsers, {
    type: "CONVENTION_STATUS",
    subject,
    contentHtml: html,
  });
}
