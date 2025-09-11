import { prisma, } from "../lib/prisma";
import { emitToUser } from "../sockets/io";
import { enqueueEmail } from "../queues/email";

type NotifyInput = {
  userId: string;
  type?: "LEAD_NEW" | "CONVENTION_UPLOADED" | "CONVENTION_STATUS" | "SERVICE_REQUEST" | "SERVICE_STATUS" | "GENERIC";
  subject: string;
  contentHtml?: string;
  email?: { to?: string; subject?: string; html?: string; text?: string } | false; // false disables email
};

/**
 * Creates a Notification row, emits socket events, and optionally enqueues an email.
 * Returns the created Notification.
 */
export async function notifyUser(input: NotifyInput) {
  const notif = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: (input.type ?? "GENERIC") as any,
      subject: input.subject,
      contentHtml: input.contentHtml,
    },
  });

  // realtime: push to user room + badge update
  emitToUser(input.userId, "notify:new", notif);
  const unread = await prisma.notification.count({
    where: { userId: input.userId, read: false },
  });
  emitToUser(input.userId, "badge:update", { unread });

  // optional email
  if (input.email !== false) {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true },
    });
    if (user?.email) {
      await enqueueEmail({
        to: input.email?.to ?? user.email,
        subject: input.email?.subject ?? input.subject,
        html: input.email?.html ?? input.contentHtml,
        text: input.email?.text,
      });
    }
  }

  return notif;
}

export async function notifyUsers(
  userIds: string[],
  data: Omit<NotifyInput, "userId">
) {
  return Promise.all(userIds.map((userId) => notifyUser({ ...data, userId })));
}
