"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
// apps/api/src/config/env.ts
exports.env = {
    port: Number(process.env.PORT || 4000),
    db: process.env.DATABASE_URL,
    redis: process.env.REDIS_URL,
    webBaseUrl: process.env.WEB_BASE_URL || "http://localhost:3000",
};
