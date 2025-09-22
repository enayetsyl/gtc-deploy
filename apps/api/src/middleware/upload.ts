import multer from "multer";
import { RequestHandler } from "express";

// Feature flag: if UPLOADS_ENABLED !== 'true', we short-circuit and ignore incoming files.
// This lets us deploy to environments (e.g., Render free tier) without persistent storage.
// To re-enable real uploads later, just set UPLOADS_ENABLED=true (no code change needed).

const realUpload = multer({ storage: multer.memoryStorage() });

export interface UploadOptions {
  multiple?: boolean;
  fieldName?: string; // default 'file'
}

export function upload(options: UploadOptions = {}): RequestHandler | RequestHandler[] {
  const { multiple = false, fieldName = "file" } = options;

  if (process.env.UPLOADS_ENABLED !== "true") {
    // No-op middleware(s) preserving API contract; req.file / req.files stay undefined.
    const noop: RequestHandler = (_req, _res, next) => next();
    return noop;
  }

  return multiple ? (realUpload.array(fieldName) as unknown as RequestHandler) : (realUpload.single(fieldName) as unknown as RequestHandler);
}
