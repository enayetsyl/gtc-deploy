// src/routes/me.ts
import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";

export const meRouter = Router();

meRouter.get("/", requireAuth, async (req, res) => {
  const me = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  if (!me) return res.status(404).json({ error: "Not found" });
  return res.json(me);
});
