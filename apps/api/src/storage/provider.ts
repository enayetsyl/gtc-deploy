import path from "node:path";
import { promises as fs } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import sanitize from "sanitize-filename";

const ROOT = process.env.FILE_STORAGE_ROOT || "./uploads";

export type StoredFile = {
  fileName: string;  // the final stored file name (uuid-original)
  path: string;      // relative path under uploads, e.g. /2025/09/uuid-name.pdf
  mime: string;
  size: number;
  checksum: string;  // sha256
};

export interface IStorage {
  put(opts: { buffer: Buffer; mime: string; originalName: string }): Promise<StoredFile>;
  remove(relPath: string): Promise<void>;
}

export class LocalStorage implements IStorage {
  async put({ buffer, mime, originalName }: { buffer: Buffer; mime: string; originalName: string }): Promise<StoredFile> {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");

    const safeName = sanitize(originalName) || "file";
    const fileName = `${randomUUID()}-${safeName}`;
    const relDir = path.posix.join("/", year, month);
    const relPath = path.posix.join(relDir, fileName);

    const absDir = path.resolve(ROOT, "." + relDir);
    const absPath = path.resolve(ROOT, "." + relPath);

    await fs.mkdir(absDir, { recursive: true });
    await fs.writeFile(absPath, buffer);

    const checksum = createHash("sha256").update(buffer).digest("hex");

    return { fileName, path: relPath, mime, size: buffer.length, checksum };
  }

  async remove(relPath: string) {
    const abs = path.resolve(ROOT, "." + relPath);
    await fs.rm(abs, { force: true });
  }
}

export const storage: IStorage = new LocalStorage();
