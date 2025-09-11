import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "ValidationError", issues: err.issues });
  }
  return res.status(500).json({ error: "InternalServerError" });
}
