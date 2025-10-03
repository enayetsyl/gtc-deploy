"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createLogger = createLogger;
const pino_1 = __importDefault(require("pino"));
const isProd = process.env.NODE_ENV === "production";
const level = process.env.LOG_LEVEL || (isProd ? "info" : "debug");
const options = {
    level,
    base: { service: "@gtc/api" },
    redact: {
        remove: true,
        paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "req.body.password",
            "req.body.token",
            "res.headers[set-cookie]",
        ],
    },
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
    messageKey: "message",
};
function createLogger() {
    if (!isProd) {
        // Pretty transport for local dev only
        return (0, pino_1.default)({
            ...options,
            transport: {
                target: "pino-pretty",
                options: {
                    colorize: true,
                    translateTime: "SYS:standard",
                    singleLine: false,
                    ignore: "pid,hostname",
                },
            },
        });
    }
    return (0, pino_1.default)(options);
}
exports.logger = createLogger();
