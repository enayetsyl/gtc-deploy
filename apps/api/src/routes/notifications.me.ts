import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";

export const meNotifications = Router();
meNotifications.use(requireAuth);

// cursor pagination
meNotifications.get("/", async (req, res) => {
  const take = Math.min(50, Math.max(1, Number(req.query.take ?? 20)));
  const cursor = (req.query.cursor as string | undefined) || undefined;

  const items = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = items.length > take;
  const sliced = hasMore ? items.slice(0, take) : items;
  const nextCursor = hasMore ? sliced[sliced.length - 1].id : null;

  res.json({ items: sliced, nextCursor });
});

meNotifications.get("/unread-count", async (req, res) => {
  const count = await prisma.notification.count({
    where: { userId: req.user!.id, read: false },
  });
  res.json({ unread: count });
});

meNotifications.post("/:id/read", async (req, res) => {
  const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
  // restrict update to notifications owned by the authenticated user
  const result = await prisma.notification.updateMany({
    where: { id, userId: req.user!.id },
    data: { read: true },
  });
  if (result.count === 0) {
    return res.status(404).json({ error: "notification not found" });
  }
  // fetch and return the updated notification
  const notif = await prisma.notification.findUnique({ where: { id } });
  res.json(notif);
});
