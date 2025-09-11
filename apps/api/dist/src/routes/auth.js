"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
// src/routes/auth.ts
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const argon2_1 = __importDefault(require("argon2"));
const jwt_1 = require("../lib/jwt");
exports.authRouter = (0, express_1.Router)();
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
exports.authRouter.post("/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "ValidationError", issues: parsed.error.issues });
    }
    const { email, password } = parsed.data;
    const user = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (!user || !(await argon2_1.default.verify(user.passwordHash, password))) {
        return res.status(401).json({ error: "Invalid credentials" });
    }
    const access = (0, jwt_1.signAccessToken)({ sub: user.id, email: user.email, role: user.role });
    const { token: refresh } = await (0, jwt_1.signRefreshToken)(user.id);
    (0, jwt_1.setRefreshCookie)(res, refresh);
    res.json({
        accessToken: access,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
});
exports.authRouter.post("/refresh", async (req, res) => {
    const rt = req.cookies?.rt;
    if (!rt)
        return res.status(401).json({ error: "Missing refresh token" });
    try {
        const decoded = await (0, jwt_1.verifyRefreshToken)(rt);
        // rotate refresh token: revoke old, issue new
        await (0, jwt_1.revokeRefreshToken)(decoded.jti);
        const { token: newRefresh } = await (0, jwt_1.signRefreshToken)(decoded.sub);
        (0, jwt_1.setRefreshCookie)(res, newRefresh);
        // fetch user (role/email may have changed)
        const user = await prisma_1.prisma.user.findUnique({ where: { id: decoded.sub } });
        if (!user)
            return res.status(401).json({ error: "User not found" });
        const access = (0, jwt_1.signAccessToken)({ sub: user.id, email: user.email, role: user.role });
        return res.json({ accessToken: access });
    }
    catch (e) {
        (0, jwt_1.clearRefreshCookie)(res);
        return res.status(401).json({ error: "Invalid refresh token" });
    }
});
exports.authRouter.post("/logout", async (req, res) => {
    const rt = req.cookies?.rt;
    if (rt) {
        try {
            const decoded = await (0, jwt_1.verifyRefreshToken)(rt);
            await (0, jwt_1.revokeRefreshToken)(decoded.jti);
        }
        catch {
            // ignore
        }
    }
    (0, jwt_1.clearRefreshCookie)(res);
    return res.json({ ok: true });
});
