// apps/api/src/lib/redis.ts
import { Redis } from "ioredis";
export const redis = new Redis(process.env.REDIS_URL!);
