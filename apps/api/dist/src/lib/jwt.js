"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccessToken = signAccessToken;
exports.signRefreshToken = signRefreshToken;
exports.setRefreshCookie = setRefreshCookie;
exports.clearRefreshCookie = clearRefreshCookie;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.revokeRefreshToken = revokeRefreshToken;
exports.signInviteToken = signInviteToken;
exports.verifyInviteToken = verifyInviteToken;
exports.revokeInviteToken = revokeInviteToken;
// src/lib/jwt.ts
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = require("crypto");
// In-memory storage for tokens (will be lost on server restart)
const tokenStore = new Map();
// Cleanup expired tokens periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of tokenStore.entries()) {
        if (value.expiresAt < now) {
            tokenStore.delete(key);
        }
    }
}, 60000); // Clean up every minute
const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL ?? "15m";
const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7);
const JWT_SECRET = process.env.JWT_SECRET ?? "dev_supersecret_change_me";
const REFRESH_COOKIE = "rt";
const INVITE_TTL_DAYS = Number(process.env.INVITE_TOKEN_TTL_DAYS ?? 7);
function signAccessToken(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TTL });
}
async function signRefreshToken(userId) {
    const jti = (0, crypto_1.randomUUID)();
    const token = jsonwebtoken_1.default.sign({ sub: userId, jti }, JWT_SECRET, { expiresIn: `${REFRESH_TTL_DAYS}d` });
    // store jti in memory with ttl
    const ttlSecs = REFRESH_TTL_DAYS * 24 * 60 * 60;
    const expiresAt = Date.now() + (ttlSecs * 1000);
    tokenStore.set(`refresh:${jti}`, { userId, expiresAt });
    return { token, jti };
}
function setRefreshCookie(res, token) {
    res.cookie(REFRESH_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false, // set true behind HTTPS in prod
        path: "/api/auth/refresh",
        maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
    });
}
function clearRefreshCookie(res) {
    res.clearCookie(REFRESH_COOKIE, { path: "/api/auth/refresh" });
}
function verifyAccessToken(token) {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
}
async function verifyRefreshToken(token) {
    const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
    const stored = tokenStore.get(`refresh:${decoded.jti}`);
    if (!stored || stored.expiresAt < Date.now()) {
        throw new Error("refresh_revoked");
    }
    return decoded;
}
async function revokeRefreshToken(jti) {
    tokenStore.delete(`refresh:${jti}`);
}
// One-time invite tokens for account activation / password set
async function signInviteToken(userId) {
    const jti = (0, crypto_1.randomUUID)();
    const token = jsonwebtoken_1.default.sign({ sub: userId, jti, kind: "invite" }, JWT_SECRET, { expiresIn: `${INVITE_TTL_DAYS}d` });
    const ttlSecs = INVITE_TTL_DAYS * 24 * 60 * 60;
    const expiresAt = Date.now() + (ttlSecs * 1000);
    tokenStore.set(`invite:${jti}`, { userId, expiresAt });
    return { token, jti };
}
async function verifyInviteToken(token) {
    const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
    if (decoded.kind !== "invite")
        throw new Error("invalid_invite_kind");
    const stored = tokenStore.get(`invite:${decoded.jti}`);
    if (!stored || stored.expiresAt < Date.now()) {
        throw new Error("invite_revoked");
    }
    return decoded;
}
async function revokeInviteToken(jti) {
    tokenStore.delete(`invite:${jti}`);
}
