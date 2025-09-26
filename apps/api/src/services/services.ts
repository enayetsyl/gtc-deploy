import { prisma } from "../lib/prisma";
import { notifyUsers } from "./notifications";
import { getAdmins, getPointUsers } from "./conventions";

/** Point → request a service (notifies Admins) */
export async function onServiceRequested(gtcPointId: string, serviceId: string) {
  const [point, service] = await Promise.all([
    prisma.gtcPoint.findUnique({ where: { id: gtcPointId }, include: { sector: true } }),
    prisma.service.findUnique({ where: { id: serviceId } }),
  ]);
  if (!point || !service) return;

  const subject = `Richiesta di servizio: ${service.name} dal punto ${point.name}`;
  const html = `<p><b>Punto:</b> ${point.name} / ${point.sector?.name ?? ""}<br/><b>Servizio:</b> ${service.name} (${service.code})</p>`;

  const admins = await getAdmins();
  await notifyUsers(admins, {
    type: "SERVICE_REQUEST",
    subject,
    contentHtml: html,
  });
}

/** Admin → enable/disable (notifies Point users) */
export async function onServiceStatusChanged(
  gtcPointId: string,
  serviceId: string,
  status: "ENABLED" | "DISABLED"
) {
  const [point, service] = await Promise.all([
    prisma.gtcPoint.findUnique({ where: { id: gtcPointId }, include: { sector: true } }),
    prisma.service.findUnique({ where: { id: serviceId } }),
  ]);
  if (!point || !service) return;

  const subject = `Servizio ${status === "ENABLED" ? "ATTIVATO" : "DISATTIVATO"}: ${service.name}`;
  const html = `<p>Il tuo servizio <b>${service.name}</b> è stato <b>${status === "ENABLED" ? "attivato" : "disattivato"}</b>.</p>`;

  const users = await getPointUsers(gtcPointId);
  await notifyUsers(users, {
    type: "SERVICE_STATUS",
    subject,
    contentHtml: html,
  });
}
