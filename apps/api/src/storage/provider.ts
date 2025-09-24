import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import sanitize from "sanitize-filename";
import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

export type StoredFile = {
  fileName: string;  // the final stored file name (uuid-original)
  path: string;      // UploadThing file URL
  mime: string;
  size: number;
  checksum: string;  // sha256
  uploadthingKey?: string; // UploadThing file key for deletion
};

export interface IStorage {
  put(opts: { buffer: Buffer; mime: string; originalName: string }): Promise<StoredFile>;
  remove(relPath: string): Promise<void>;
}

export class UploadThingStorage implements IStorage {
  async put({ buffer, mime, originalName }: { buffer: Buffer; mime: string; originalName: string }): Promise<StoredFile> {
    const safeName = sanitize(originalName) || "file";

    try {
      // Use UTApi.uploadFilesFromUrl or similar approach
      // Create a Blob-like object compatible with UTApi
      const fileData = {
        name: safeName,
        size: buffer.length,
        type: mime,
        customId: randomUUID(),
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

      const checksum = createHash("sha256").update(buffer).digest("hex");

      return {
        fileName: safeName,
        path: response.data.url, // This is the UploadThing URL
        mime,
        size: buffer.length,
        checksum,
        uploadthingKey: response.data.key,
      };
    } catch (error) {
      console.error('Error in UploadThingStorage.put:', error);
      throw error;
    }
  }

  async remove(fileKey: string) {
    try {
      await utapi.deleteFiles(fileKey);
    } catch (error) {
      console.error("Failed to delete file from UploadThing:", error);
      // Don't throw - file might already be deleted
    }
  }
}

// Fallback local storage for development/testing
export class LocalStorage implements IStorage {
  async put({ buffer, mime, originalName }: { buffer: Buffer; mime: string; originalName: string }): Promise<StoredFile> {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");

    const safeName = sanitize(originalName) || "file";
    const fileName = `${randomUUID()}-${safeName}`;
    const relDir = path.posix.join("/", year, month);
    const relPath = path.posix.join(relDir, fileName);

    // For local storage, we'd normally write to disk here
    // This is kept for backward compatibility but won't be used

    const checksum = createHash("sha256").update(buffer).digest("hex");

    return { fileName, path: relPath, mime, size: buffer.length, checksum };
  }

  async remove(relPath: string) {
    // Local file removal - kept for compatibility
  }
}

export const storage: IStorage = process.env.UPLOADTHING_TOKEN
  ? new UploadThingStorage()
  : new LocalStorage();
