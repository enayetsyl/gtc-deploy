"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageProxy = void 0;
const express_1 = __importDefault(require("express"));
const node_fetch_1 = __importDefault(require("node-fetch"));
exports.imageProxy = express_1.default.Router();
// GET /api/image-proxy?url=<encodedUrl>
exports.imageProxy.get("/image-proxy", async (req, res) => {
    const url = req.query.url;
    if (!url || typeof url !== "string")
        return res.status(400).send("Missing url");
    try {
        const parsed = new URL(url);
        // Basic safety: only allow http(s)
        if (!["http:", "https:"].includes(parsed.protocol))
            return res.status(400).send("Invalid protocol");
    }
    catch (e) {
        return res.status(400).send("Invalid url");
    }
    try {
        const upstream = await (0, node_fetch_1.default)(url);
        if (!upstream.ok)
            return res.status(502).send("Upstream fetch failed");
        const contentType = upstream.headers.get("content-type") || "application/octet-stream";
        res.setHeader("Content-Type", contentType);
        // Allow cross-origin usage from clients
        res.setHeader("Access-Control-Allow-Origin", "*");
        // Stream upstream body to client
        const body = upstream.body;
        if (!body)
            return res.status(502).send("No body from upstream");
        body.pipe(res);
    }
    catch (err) {
        console.error("image-proxy error", err);
        res.status(500).send("Proxy error");
    }
});
exports.default = exports.imageProxy;
