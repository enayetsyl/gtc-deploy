// src/types/express.d.ts
import "express";
import type { Multer } from "multer"; // type import only

declare global {
  // Feature flag for uploads (set in env). When false, upload middleware becomes a no-op.
  // Not strictly necessary to type, but helpful for clarity if referenced via process.env.
  // Usage: if (process.env.UPLOADS_ENABLED === 'true') enable real upload logic.
}

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: string;
      email: string;
      role: "ADMIN" | "SECTOR_OWNER" | "GTC_POINT" | "EXTERNAL";
    };
    file?: Express.Multer.File;
    files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
  }
}
