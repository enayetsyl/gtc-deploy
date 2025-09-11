// src/routes/auth.ts
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import argon2 from "argon2";
import {
  clearRefreshCookie,
  revokeRefreshToken,
  setRefreshCookie,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../lib/jwt";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await argon2.verify(user.passwordHash, password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const access = signAccessToken({ sub: user.id, email: user.email, role: user.role as any });
  const { token: refresh } = await signRefreshToken(user.id);
  setRefreshCookie(res, refresh);

  res.json({
    accessToken: access,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

authRouter.post("/refresh", async (req, res) => {
  const rt = req.cookies?.rt as string | undefined;
  if (!rt) return res.status(401).json({ error: "Missing refresh token" });

  try {
    const decoded = await verifyRefreshToken(rt);
    // rotate refresh token: revoke old, issue new
    await revokeRefreshToken(decoded.jti);
    const { token: newRefresh } = await signRefreshToken(decoded.sub);
    setRefreshCookie(res, newRefresh);

    // fetch user (role/email may have changed)
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) return res.status(401).json({ error: "User not found" });

    const access = signAccessToken({ sub: user.id, email: user.email, role: user.role as any });
    return res.json({ accessToken: access });
  } catch (e) {
    clearRefreshCookie(res);
    return res.status(401).json({ error: "Invalid refresh token" });
  }
});

authRouter.post("/logout", async (req, res) => {
  const rt = req.cookies?.rt as string | undefined;
  if (rt) {
    try {
      const decoded = await verifyRefreshToken(rt);
      await revokeRefreshToken(decoded.jti);
    } catch {
      // ignore
    }
  }
  clearRefreshCookie(res);
  return res.json({ ok: true });
});
