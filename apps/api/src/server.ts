// apps/api/src/server.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import { errorHandler } from "./middleware/error";
import { router as healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth";
import { meRouter } from "./routes/me";
import { adminSectors } from "./routes/admin.sectors";
import { adminPoints } from "./routes/admin.points";
import { adminServices } from "./routes/admin.services"; import { meNotifications } from "./routes/notifications.me";
import { devNotify } from "./routes/dev";
import { conventionsRouter } from "./routes/conventions";
import { adminConventions } from "./routes/admin.conventions";
import { pointServices } from "./routes/point.services";
import { adminLeads } from "./routes/admin.leads";
import { meLeads } from "./routes/me.leads";
import { leadsPublic } from "./routes/leads.public";
import { leadFiles } from "./routes/leads.files";
import { sectorsPublic } from "./routes/sectors.public";
import { pointsOnboardingPublic } from "./routes/points.onboarding.public";

export const app = express();

app.use(cors({
  origin: ["http://localhost:3000"],
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

app.use("/uploads", express.static(path.resolve("uploads")));
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api/admin/sectors", adminSectors);
app.use("/api/admin/points", adminPoints);
app.use("/api/admin/services", adminServices);
app.use("/api/me/notifications", meNotifications);
app.use("/api/dev", devNotify);
app.use("/api/conventions", conventionsRouter);
app.use("/api/admin/conventions", adminConventions);
app.use("/api/point/services", pointServices);
app.use("/api/leads/public", leadsPublic);
app.use("/api/leads", leadFiles);
app.use("/api/me/leads", meLeads);
app.use("/api/admin/leads", adminLeads);
app.use("/api/sectors/public", sectorsPublic);
app.use("/api/public/onboarding/points", pointsOnboardingPublic);


app.use(errorHandler);