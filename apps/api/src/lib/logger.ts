import pino, { LoggerOptions } from "pino";

const isProd = process.env.NODE_ENV === "production";

const level = process.env.LOG_LEVEL || (isProd ? "info" : "debug");

const options: LoggerOptions = {
  level,
  base: { service: "@gtc/api" },
  redact: {
    remove: true,
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.token",
      "res.headers[set-cookie]",
    ],
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  messageKey: "message",
};

export function createLogger() {
  if (!isProd) {
    // Pretty transport for local dev only
    return pino({
      ...options,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          singleLine: false,
          ignore: "pid,hostname",
        },
      },
    });
  }
  return pino(options);
}

export const logger = createLogger();
