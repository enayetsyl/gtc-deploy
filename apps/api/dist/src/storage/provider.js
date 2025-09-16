"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.LocalStorage = void 0;
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = require("node:fs");
const node_crypto_1 = require("node:crypto");
const sanitize_filename_1 = __importDefault(require("sanitize-filename"));
const ROOT = process.env.FILE_STORAGE_ROOT || "./uploads";
class LocalStorage {
    async put({ buffer, mime, originalName }) {
        const now = new Date();
        const year = String(now.getFullYear());
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const safeName = (0, sanitize_filename_1.default)(originalName) || "file";
        const fileName = `${(0, node_crypto_1.randomUUID)()}-${safeName}`;
        const relDir = node_path_1.default.posix.join("/", year, month);
        const relPath = node_path_1.default.posix.join(relDir, fileName);
        const absDir = node_path_1.default.resolve(ROOT, "." + relDir);
        const absPath = node_path_1.default.resolve(ROOT, "." + relPath);
        await node_fs_1.promises.mkdir(absDir, { recursive: true });
        await node_fs_1.promises.writeFile(absPath, buffer);
        const checksum = (0, node_crypto_1.createHash)("sha256").update(buffer).digest("hex");
        return { fileName, path: relPath, mime, size: buffer.length, checksum };
    }
    async remove(relPath) {
        const abs = node_path_1.default.resolve(ROOT, "." + relPath);
        await node_fs_1.promises.rm(abs, { force: true });
    }
}
exports.LocalStorage = LocalStorage;
exports.storage = new LocalStorage();
