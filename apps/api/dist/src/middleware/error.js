"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
function errorHandler(err, _req, res, _next) {
    console.error(err);
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({ error: "ValidationError", issues: err.issues });
    }
    return res.status(500).json({ error: "InternalServerError" });
}
