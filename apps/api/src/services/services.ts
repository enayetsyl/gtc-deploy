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

  const subject = `Service request: ${service.name} from ${point.name}`;
  const html = `<p><b>Point:</b> ${point.name} / ${point.sector?.name ?? ""}<br/><b>Service:</b> ${service.name} (${service.code})</p>`;

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

  const subject = `Service ${status === "ENABLED" ? "enabled" : "disabled"}: ${service.name}`;
  const html = `<p>Your service <b>${service.name}</b> has been <b>${status}</b>.</p>`;

  const users = await getPointUsers(gtcPointId);
  await notifyUsers(users, {
    type: "SERVICE_STATUS",
    subject,
    contentHtml: html,
  });
}
