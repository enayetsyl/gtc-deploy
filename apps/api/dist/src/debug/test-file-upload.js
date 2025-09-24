"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const server_1 = require("uploadthing/server");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const utapi = new server_1.UTApi();
async function testFileUpload() {
    try {
        console.log("Testing file upload with dl.pdf...");
        console.log("UPLOADTHING_TOKEN exists:", !!process.env.UPLOADTHING_TOKEN);
        console.log("UPLOADTHING_SECRET exists:", !!process.env.UPLOADTHING_SECRET);
        // Read the file
        const filePath = path_1.default.resolve("../../dl.pdf");
        console.log("Reading file from:", filePath);
        const fileBuffer = (0, fs_1.readFileSync)(filePath);
        console.log("File size:", fileBuffer.length, "bytes");
        // Create a File object
        const file = new File([fileBuffer], "dl.pdf", {
            type: "application/pdf"
        });
        console.log("Uploading file:", file.name, file.size, file.type);
        // Upload using UTApi
        const result = await utapi.uploadFiles(file);
        console.log("Upload result:", result);
        if (result.data) {
            console.log("✅ Upload successful!");
            console.log("File URL:", result.data.url);
            console.log("File Key:", result.data.key);
            console.log("File Name:", result.data.name);
            // Test listing files to confirm it's there
            console.log("\n--- Listing files to confirm upload ---");
            const filesList = await utapi.listFiles({ limit: 5 });
            console.log("Files in UploadThing:", filesList);
        }
        else {
            console.log("❌ Upload failed:", result.error);
        }
    }
    catch (error) {
        console.error("❌ Error during upload:", error);
    }
}
// Run the test
testFileUpload();
