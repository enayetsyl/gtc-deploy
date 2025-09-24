"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadthingRouter = void 0;
const express_1 = require("express");
const server_1 = require("uploadthing/server");
const uploadthing_1 = require("../lib/uploadthing");
const router = (0, express_1.Router)();
exports.uploadthingRouter = router;
// Create the route handler
const routeHandler = (0, server_1.createRouteHandler)({
    router: uploadthing_1.ourFileRouter,
});
// Convert Express Request to Web API Request object
function createWebRequest(req) {
    const url = new URL(req.originalUrl || req.url, `http://${req.headers.host}`);
    return new Request(url, {
        method: req.method,
        headers: new Headers(req.headers),
        body: req.method === 'GET' || req.method === 'HEAD' ? null : JSON.stringify(req.body),
    });
}
// Handle GET requests
router.get("/", async (req, res, next) => {
    try {
        const webRequest = createWebRequest(req);
        const response = await routeHandler(webRequest);
        const body = await response.text();
        res.status(response.status)
            .set(Object.fromEntries(response.headers.entries()))
            .send(body);
    }
    catch (error) {
        next(error);
    }
});
// Handle POST requests  
router.post("/", async (req, res, next) => {
    try {
        console.log("UploadThing POST request:", {
            body: req.body,
            headers: req.headers,
            url: req.url,
            method: req.method
        });
        const webRequest = createWebRequest(req);
        console.log("Created web request:", {
            url: webRequest.url,
            method: webRequest.method,
            headers: Object.fromEntries(webRequest.headers.entries())
        });
        const response = await routeHandler(webRequest);
        console.log("UploadThing response:", {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries())
        });
        const body = await response.text();
        console.log("Response body:", body);
        res.status(response.status)
            .set(Object.fromEntries(response.headers.entries()))
            .send(body);
    }
    catch (error) {
        console.error("UploadThing POST error:", error);
        next(error);
    }
});
