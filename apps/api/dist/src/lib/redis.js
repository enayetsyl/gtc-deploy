"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
// apps/api/src/lib/redis.ts
const ioredis_1 = require("ioredis");
exports.redis = new ioredis_1.Redis(process.env.REDIS_URL);
