// src/lib/jwt.ts
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import type { Response } from "express";
import { redis } from "./redis";
import { randomUUID } from "crypto";

const ACCESS_TTL: string = process.env.ACCESS_TOKEN_TTL ?? "15m";
const REFRESH_TTL_DAYS: number = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7);

const JWT_SECRET: Secret = process.env.JWT_SECRET ?? "dev_supersecret_change_me";
const REFRESH_COOKIE = "rt";
const INVITE_TTL_DAYS: number = Number(process.env.INVITE_TOKEN_TTL_DAYS ?? 7);

type Role = "ADMIN" | "SECTOR_OWNER" | "GTC_POINT" | "EXTERNAL";

export function signAccessToken(payload: { sub: string; email: string; role: Role }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TTL } as SignOptions);
}

export async function signRefreshToken(userId: string) {
  const jti = randomUUID();
  const token = jwt.sign({ sub: userId, jti }, JWT_SECRET, { expiresIn: `${REFRESH_TTL_DAYS}d` });
  // store jti in redis with ttl
  const ttlSecs = REFRESH_TTL_DAYS * 24 * 60 * 60;
  await redis.set(`refresh:${jti}`, userId, "EX", ttlSecs);
  return { token, jti };
}

export function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // set true behind HTTPS in prod
    path: "/api/auth/refresh",
    maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth/refresh" });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as { sub: string; email: string; role: Role; iat: number; exp: number };
}

export async function verifyRefreshToken(token: string) {
  const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; jti: string; iat: number; exp: number };
  const exists = await redis.get(`refresh:${decoded.jti}`);
  if (!exists) throw new Error("refresh_revoked");
  return decoded;
}

export async function revokeRefreshToken(jti: string) {
  await redis.del(`refresh:${jti}`);
}

// One-time invite tokens for account activation / password set
export async function signInviteToken(userId: string) {
  const jti = randomUUID();
  const token = jwt.sign({ sub: userId, jti, kind: "invite" as const }, JWT_SECRET, { expiresIn: `${INVITE_TTL_DAYS}d` });
  const ttlSecs = INVITE_TTL_DAYS * 24 * 60 * 60;
  await redis.set(`invite:${jti}`, userId, "EX", ttlSecs);
  return { token, jti };
}

export async function verifyInviteToken(token: string) {
  const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; jti: string; kind?: string; iat: number; exp: number };
  if (decoded.kind !== "invite") throw new Error("invalid_invite_kind");
  const exists = await redis.get(`invite:${decoded.jti}`);
  if (!exists) throw new Error("invite_revoked");
  return decoded;
}

export async function revokeInviteToken(jti: string) {
  await redis.del(`invite:${jti}`);
}
