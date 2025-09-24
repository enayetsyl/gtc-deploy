import multer from "multer";
import { RequestHandler } from "express";


// Feature flag: if UPLOADS_ENABLED !== 'true', we short-circuit and ignore incoming files.
// This lets us deploy to environments (e.g., Render free tier) without persistent storage.
// During transition to UploadThing, we still need to parse multipart data

const realUpload = multer({ storage: multer.memoryStorage() });

export interface UploadOptions {
  multiple?: boolean;
  fieldName?: string; // default 'file'
}

export function upload(options: UploadOptions = {}): RequestHandler | RequestHandler[] {
  const { multiple = false } = options;

  // During transition, we need to parse multipart data to handle form fields and files
  // Always enable during development or when explicitly requested
  const shouldParseMultipart =
    process.env.UPLOADS_ENABLED === "true" ||
    process.env.NODE_ENV === "development" ||
    !process.env.NODE_ENV; // Default to enabled if NODE_ENV is not set

  if (!shouldParseMultipart) {
    // No-op middleware preserving API contract; req.file / req.files stay undefined.
    const noop: RequestHandler = (_req, _res, next) => next();
    return noop;
  }

  // During transition period, always use .any() to accept files with any field name
  // This allows frontend to send files with field names like 'files', 'signature', etc.
  return realUpload.any() as unknown as RequestHandler;
}
