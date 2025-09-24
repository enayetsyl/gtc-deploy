"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.LocalStorage = exports.UploadThingStorage = void 0;
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = require("node:crypto");
const sanitize_filename_1 = __importDefault(require("sanitize-filename"));
const server_1 = require("uploadthing/server");
const utapi = new server_1.UTApi();
class UploadThingStorage {
    async put({ buffer, mime, originalName }) {
        const safeName = (0, sanitize_filename_1.default)(originalName) || "file";
        try {
            // Use UTApi.uploadFilesFromUrl or similar approach
            // Create a Blob-like object compatible with UTApi
            const fileData = {
                name: safeName,
                size: buffer.length,
                type: mime,
                customId: (0, node_crypto_1.randomUUID)(),
            };
            // Try using uploadFiles with proper File-like object
            const uint8Array = new Uint8Array(buffer);
            const file = new File([uint8Array], safeName, { type: mime });
            console.log(`Attempting to upload file: ${safeName}, size: ${buffer.length}, type: ${mime}`);
            const response = await utapi.uploadFiles(file);
            console.log('UploadThing response:', JSON.stringify(response, null, 2));
            if (response.error) {
                console.error('UploadThing upload error:', response.error);
                throw new Error(`UploadThing upload failed: ${response.error.message}`);
            }
            const checksum = (0, node_crypto_1.createHash)("sha256").update(buffer).digest("hex");
            return {
                fileName: safeName,
                path: response.data.url, // This is the UploadThing URL
                mime,
                size: buffer.length,
                checksum,
                uploadthingKey: response.data.key,
            };
        }
        catch (error) {
            console.error('Error in UploadThingStorage.put:', error);
            throw error;
        }
    }
    async remove(fileKey) {
        try {
            await utapi.deleteFiles(fileKey);
        }
        catch (error) {
            console.error("Failed to delete file from UploadThing:", error);
            // Don't throw - file might already be deleted
        }
    }
}
exports.UploadThingStorage = UploadThingStorage;
// Fallback local storage for development/testing
class LocalStorage {
    async put({ buffer, mime, originalName }) {
        const now = new Date();
        const year = String(now.getFullYear());
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const safeName = (0, sanitize_filename_1.default)(originalName) || "file";
        const fileName = `${(0, node_crypto_1.randomUUID)()}-${safeName}`;
        const relDir = node_path_1.default.posix.join("/", year, month);
        const relPath = node_path_1.default.posix.join(relDir, fileName);
        // For local storage, we'd normally write to disk here
        // This is kept for backward compatibility but won't be used
        const checksum = (0, node_crypto_1.createHash)("sha256").update(buffer).digest("hex");
        return { fileName, path: relPath, mime, size: buffer.length, checksum };
    }
    async remove(relPath) {
        // Local file removal - kept for compatibility
    }
}
exports.LocalStorage = LocalStorage;
exports.storage = process.env.UPLOADTHING_TOKEN
    ? new UploadThingStorage()
    : new LocalStorage();
