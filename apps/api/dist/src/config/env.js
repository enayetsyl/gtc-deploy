"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
// apps/api/src/config/env.ts
exports.env = {
    port: Number(process.env.PORT || 4000),
    db: process.env.DATABASE_URL,
    webBaseUrl: process.env.WEB_BASE_URL || "http://localhost:3000",
    corsOrigins: (() => {
        const raw = process.env.CORS_ORIGIN || process.env.WEB_BASE_URL || "http://localhost:3000";
        // Allow comma or space separated list
        return raw
            .split(/[,\s]+/)
            .map(s => s.trim())
            .filter(Boolean);
    })(),
};
