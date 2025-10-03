"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpLogger = void 0;
const pino_http_1 = __importDefault(require("pino-http"));
const node_crypto_1 = require("node:crypto");
const logger_1 = require("../lib/logger");
exports.httpLogger = (0, pino_http_1.default)({
    logger: logger_1.logger,
    genReqId: function (req, res) {
        const existing = (req.headers["x-request-id"] || req.headers["x-correlation-id"]);
        const id = existing || (0, node_crypto_1.randomUUID)();
        res.setHeader("x-request-id", id);
        return id;
    },
    autoLogging: { ignorePaths: ["/api/health"] },
    customLogLevel: function (_req, res, err) {
        if (err || res.statusCode >= 500)
            return "error";
        if (res.statusCode >= 400)
            return "warn";
        return "info";
    },
    serializers: {
        req(req) {
            return {
                id: req.id,
                method: req.method,
                url: req.url,
            };
        },
        res(res) {
            return {
                statusCode: res.statusCode,
            };
        },
    },
});
