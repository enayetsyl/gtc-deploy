"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugRouter = void 0;
const express_1 = require("express");
const utapi_test_1 = require("../debug/utapi-test");
const mailer_1 = require("../lib/mailer");
const router = (0, express_1.Router)();
exports.debugRouter = router;
// Simple test endpoint to verify UploadThing configuration
router.get("/test-uploadthing", async (req, res) => {
    try {
        console.log("Testing UploadThing configuration...");
        console.log("UPLOADTHING_SECRET exists:", !!process.env.UPLOADTHING_SECRET);
        console.log("UPLOADTHING_TOKEN exists:", !!process.env.UPLOADTHING_TOKEN);
        res.json({
            success: true,
            hasSecret: !!process.env.UPLOADTHING_SECRET,
            hasToken: !!process.env.UPLOADTHING_TOKEN,
            message: "UploadThing configuration check complete"
        });
    }
    catch (error) {
        console.error("UploadThing test failed:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
// Test UTApi directly
router.get("/test-utapi", async (req, res) => {
    try {
        const result = await (0, utapi_test_1.testUploadThingApi)();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
// Optional: quick email test endpoint
router.get("/test-email", async (req, res) => {
    try {
        const to = req.query.to || process.env.MAIL_USER || "";
        if (!to)
            return res.status(400).json({ success: false, error: "Provide ?to=email@example.com or set MAIL_USER" });
        await (0, mailer_1.sendEmail)({
            to,
            subject: "Test email from GTC API",
            html: `<p>Hello from GTC API. Provider: ${process.env.MAIL_PROVIDER || "gmail"}</p>`,
        });
        res.json({ success: true, to });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
});
