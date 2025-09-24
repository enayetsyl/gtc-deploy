"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testUploadThingConnection = testUploadThingConnection;
// Test UploadThing token validity
const server_1 = require("uploadthing/server");
const utapi = new server_1.UTApi({
    token: process.env.UPLOADTHING_TOKEN,
});
async function testUploadThingConnection() {
    try {
        console.log("Testing UploadThing connection...");
        console.log("Token exists:", !!process.env.UPLOADTHING_TOKEN);
        console.log("Token length:", process.env.UPLOADTHING_TOKEN?.length);
        // Try to list files to test connection
        const result = await utapi.listFiles({
            limit: 1,
        });
        console.log("UploadThing connection successful:", result);
        return { success: true, result };
    }
    catch (error) {
        console.error("UploadThing connection failed:", error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}
