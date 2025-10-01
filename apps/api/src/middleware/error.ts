import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../lib/logger";

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const reqId = (req as any).id;
  logger.error({ err, reqId }, "Unhandled error");
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "ValidationError", issues: err.issues, reqId });
  }
  return res.status(500).json({ error: "InternalServerError", reqId });
}
