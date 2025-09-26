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

  const subject = `Convenzione caricata: ${c.gtcPoint.name} (${c.sector.name})`;
  const html = `<p>È stata caricata una nuova convenzione firmata.</p>
<p><b>Punto:</b> ${c.gtcPoint.name}<br/>
<b>Settore:</b> ${c.sector.name}<br/>
<b>ID Convenzione:</b> ${c.id}</p>`;

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

  const subject = `Convenzione ${approved ? "APPROVATA" : "RIFIUTATA"}: ${c.gtcPoint.name}`;
  const html = `<p>La tua convenzione è stata <b>${approved ? "APPROVATA" : "RIFIUTATA"}</b>.</p>
<p><b>ID Convenzione:</b> ${c.id}${internalSalesRep ? `<br/><b>Referente interno:</b> ${internalSalesRep}` : ""}</p>`;

  const pointUsers = await getPointUsers(c.gtcPointId);
  await notifyUsers(pointUsers, {
    type: "CONVENTION_STATUS",
    subject,
    contentHtml: html,
  });
}
