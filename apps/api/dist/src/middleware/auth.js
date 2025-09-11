"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
const jwt_1 = require("../lib/jwt");
function requireAuth(req, res, next) {
    const hdr = req.headers.authorization;
    if (!hdr || !hdr.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing bearer token" });
    }
    const token = hdr.slice("Bearer ".length).trim();
    try {
        const payload = (0, jwt_1.verifyAccessToken)(token);
        req.user = { id: payload.sub, email: payload.email, role: payload.role };
        next();
    }
    catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ error: "Unauthorized" });
        if (!roles.includes(req.user.role))
            return res.status(403).json({ error: "Forbidden" });
        next();
    };
}
