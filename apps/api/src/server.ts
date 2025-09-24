// apps/api/src/server.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { env } from "./config/env";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middleware/error";
import { router as healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth";
import { meRouter } from "./routes/me";
import { mePoints } from "./routes/me.points";
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
import { uploadthingRouter } from "./routes/uploadthing";
import { debugRouter } from "./routes/debug";

// Debug - remove in production
import { testUploadThingConnection } from "./debug/uploadthing-test";

export const app = express();

app.use(cors({
  origin: (origin, callback) => {
    // Allow REST tools / same-origin requests (no origin header) and any configured origin list
    if (!origin) return callback(null, true);
    if (env.corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS: Origin not allowed"));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

// Note: /uploads static serving can be removed once fully migrated to UploadThing
// app.use("/uploads", express.static(path.resolve("uploads")));
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api/me/points", mePoints);
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
app.use("/api/uploadthing", uploadthingRouter);
app.use("/api/debug", debugRouter);

// Serve test file (remove in production)
app.get("/test-upload", (req, res) => {
  res.sendFile(path.resolve("test-upload.html"));
});


app.use(errorHandler);