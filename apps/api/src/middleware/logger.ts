import pinoHttp, { Options as PinoHttpOptions, ReqId, HttpLogger } from "pino-http";
import { randomUUID } from "node:crypto";
import { logger } from "../lib/logger";

export const httpLogger: HttpLogger = pinoHttp({
  logger,
  genReqId: function (req, res): ReqId {
    const existing = (req.headers["x-request-id"] || req.headers["x-correlation-id"]) as string | undefined;
    const id = existing || randomUUID();
    res.setHeader("x-request-id", id);
    return id;
  },
  autoLogging: { ignorePaths: ["/api/health"] },
  customLogLevel: function (_req, res, err) {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  serializers: {
    req(req) {
      return {
        id: (req as any).id,
        method: req.method,
        url: req.url,
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
} as PinoHttpOptions);
