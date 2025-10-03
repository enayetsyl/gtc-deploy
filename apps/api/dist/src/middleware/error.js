"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const logger_1 = require("../lib/logger");
function errorHandler(err, req, res, _next) {
    const reqId = req.id;
    logger_1.logger.error({ err, reqId }, "Unhandled error");
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({ error: "ValidationError", issues: err.issues, reqId });
    }
    return res.status(500).json({ error: "InternalServerError", reqId });
}
