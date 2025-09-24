"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ourFileRouter = void 0;
const server_1 = require("uploadthing/server");
const f = (0, server_1.createUploadthing)();
// FileRouter for your app, can contain multiple FileRoutes
exports.ourFileRouter = {
    // Define as many FileRoutes as you like, each with a unique routeSlug
    leadFiles: f({
        "image/png": { maxFileSize: "4MB", maxFileCount: 10 },
        "image/jpeg": { maxFileSize: "4MB", maxFileCount: 10 },
        "application/pdf": { maxFileSize: "16MB", maxFileCount: 10 },
    }).onUploadComplete(async ({ metadata, file }) => {
        // This code RUNS ON YOUR SERVER after upload
        console.log("Upload complete for lead files:", file.url);
        // Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
        return { url: file.url };
    }),
    signatureFiles: f({
        "image/png": { maxFileSize: "2MB", maxFileCount: 1 },
        "image/jpeg": { maxFileSize: "2MB", maxFileCount: 1 },
        "image/svg+xml": { maxFileSize: "1MB", maxFileCount: 1 },
    }).onUploadComplete(async ({ metadata, file }) => {
        console.log("Upload complete for signature:", file.url);
        return { url: file.url };
    }),
};
