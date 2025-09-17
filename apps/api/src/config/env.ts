// apps/api/src/config/env.ts
export const env = {
  port: Number(process.env.PORT || 4000),
  db: process.env.DATABASE_URL!,
  redis: process.env.REDIS_URL!,
  webBaseUrl: process.env.WEB_BASE_URL || "http://localhost:3000",
};
