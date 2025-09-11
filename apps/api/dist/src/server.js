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
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const node_path_1 = __importDefault(require("node:path"));
const error_1 = require("./middleware/error");
const health_js_1 = require("./routes/health.js");
const auth_1 = require("./routes/auth");
const me_1 = require("./routes/me");
const admin_sectors_1 = require("./routes/admin.sectors");
const admin_points_1 = require("./routes/admin.points");
const admin_services_1 = require("./routes/admin.services");
exports.app = (0, express_1.default)();
exports.app.use((0, cors_1.default)({
    origin: ["http://localhost:3000"],
    credentials: true,
}));
exports.app.use((0, cookie_parser_1.default)());
exports.app.use(express_1.default.json());
exports.app.use("/uploads", express_1.default.static(node_path_1.default.resolve("uploads")));
exports.app.use("/api/health", health_js_1.router);
exports.app.use("/api/auth", auth_1.authRouter);
exports.app.use("/api/me", me_1.meRouter);
exports.app.use("/api/admin/sectors", admin_sectors_1.adminSectors);
exports.app.use("/api/admin/points", admin_points_1.adminPoints);
exports.app.use("/api/admin/services", admin_services_1.adminServices);
exports.app.use(error_1.errorHandler);
