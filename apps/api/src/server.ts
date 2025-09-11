// apps/api/src/server.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { router as healthRouter } from "./routes/health.js";

export const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.resolve("uploads")));
app.use("/api/health", healthRouter);
