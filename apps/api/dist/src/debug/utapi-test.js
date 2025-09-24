"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testUploadThingApi = testUploadThingApi;
const server_1 = require("uploadthing/server");
// Test the UTApi directly
const utapi = new server_1.UTApi();
async function testUploadThingApi() {
    try {
        console.log("Testing UTApi...");
        // Try to list files to test connection
        const files = await utapi.listFiles({ limit: 1 });
        console.log("UTApi test successful:", files);
        return { success: true, data: files };
    }
    catch (error) {
        console.error("UTApi test failed:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}
