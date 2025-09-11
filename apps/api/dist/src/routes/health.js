"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
// apps/api/src/routes/health.ts
const express_1 = require("express");
exports.router = (0, express_1.Router)();
exports.router.get("/", (_req, res) => res.json({ ok: true }));
