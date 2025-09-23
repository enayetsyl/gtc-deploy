"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
// apps/api/src/server.ts
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const env_1 = require("./config/env");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const node_path_1 = __importDefault(require("node:path"));
const error_1 = require("./middleware/error");
const health_js_1 = require("./routes/health.js");
const auth_1 = require("./routes/auth");
const me_1 = require("./routes/me");
const me_points_1 = require("./routes/me.points");
const admin_sectors_1 = require("./routes/admin.sectors");
const admin_points_1 = require("./routes/admin.points");
const admin_services_1 = require("./routes/admin.services");
const notifications_me_1 = require("./routes/notifications.me");
const dev_1 = require("./routes/dev");
const conventions_1 = require("./routes/conventions");
const admin_conventions_1 = require("./routes/admin.conventions");
const point_services_1 = require("./routes/point.services");
const admin_leads_1 = require("./routes/admin.leads");
const me_leads_1 = require("./routes/me.leads");
const leads_public_1 = require("./routes/leads.public");
const leads_files_1 = require("./routes/leads.files");
const sectors_public_1 = require("./routes/sectors.public");
const points_onboarding_public_1 = require("./routes/points.onboarding.public");
exports.app = (0, express_1.default)();
exports.app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow REST tools / same-origin requests (no origin header) and any configured origin list
        if (!origin)
            return callback(null, true);
        if (env_1.env.corsOrigins.includes(origin))
            return callback(null, true);
        return callback(new Error("CORS: Origin not allowed"));
    },
    credentials: true,
}));
exports.app.use((0, cookie_parser_1.default)());
exports.app.use(express_1.default.json());
exports.app.use("/uploads", express_1.default.static(node_path_1.default.resolve("uploads")));
exports.app.use("/api/health", health_js_1.router);
exports.app.use("/api/auth", auth_1.authRouter);
exports.app.use("/api/me", me_1.meRouter);
exports.app.use("/api/me/points", me_points_1.mePoints);
exports.app.use("/api/admin/sectors", admin_sectors_1.adminSectors);
exports.app.use("/api/admin/points", admin_points_1.adminPoints);
exports.app.use("/api/admin/services", admin_services_1.adminServices);
exports.app.use("/api/me/notifications", notifications_me_1.meNotifications);
exports.app.use("/api/dev", dev_1.devNotify);
exports.app.use("/api/conventions", conventions_1.conventionsRouter);
exports.app.use("/api/admin/conventions", admin_conventions_1.adminConventions);
exports.app.use("/api/point/services", point_services_1.pointServices);
exports.app.use("/api/leads/public", leads_public_1.leadsPublic);
exports.app.use("/api/leads", leads_files_1.leadFiles);
exports.app.use("/api/me/leads", me_leads_1.meLeads);
exports.app.use("/api/admin/leads", admin_leads_1.adminLeads);
exports.app.use("/api/sectors/public", sectors_public_1.sectorsPublic);
exports.app.use("/api/public/onboarding/points", points_onboarding_public_1.pointsOnboardingPublic);
exports.app.use(error_1.errorHandler);
