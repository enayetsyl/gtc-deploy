"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.devNotify = void 0;
const express_1 = require("express");
const notifications_1 = require("../services/notifications");
const auth_1 = require("../middleware/auth");
exports.devNotify = (0, express_1.Router)();
exports.devNotify.use(auth_1.requireAuth, (0, auth_1.requireRole)("ADMIN"));
exports.devNotify.post("/test", async (req, res) => {
    const userId = req.user.id;
    const n = await (0, notifications_1.notifyUser)({
        userId,
        subject: "Test notification",
        contentHtml: "<p>Hello from Phase 3!</p>",
        type: "GENERIC",
    });
    res.json(n);
});
