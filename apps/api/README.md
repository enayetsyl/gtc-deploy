# @gtc/api

## Logging

We use Pino for structured logging.

- Dev: pretty printed logs via pino-pretty
- Prod (Render): JSON logs (auto-detected), ideal for log aggregation

Environment variables:
- `LOG_LEVEL`: trace | debug | info | warn | error | fatal (default: debug in dev, info in prod)

Usage in code:
- Use the request-scoped logger: `req.log.info({ userId }, "did something")`
- Or the root logger: `import { logger } from "./lib/logger"; logger.info("boot")`

HTTP access logs are emitted automatically for all requests (excluding `/api/health`). Each request has an `x-request-id` header to help correlate logs.
