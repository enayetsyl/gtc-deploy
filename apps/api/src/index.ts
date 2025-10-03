// apps/api/src/index.ts
import { createServer } from "http";
import { Server } from "socket.io";
import { initSockets } from "./sockets";
import { app } from "./server";
import { setIO } from "./sockets/io";
import { logger } from "./lib/logger";

// Import worker to start email processing - REMOVED since not using queues
// import "./queues/worker";

const server = createServer(app);
const io = new Server(server, { cors: { origin: ["http://localhost:3000"] } });
setIO(io);
initSockets(io);

// dev-only route
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => logger.info({ port: PORT }, "API listening"));

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  // Don't exit in dev automatically
  if (process.env.NODE_ENV === "production") process.exit(1);
});
