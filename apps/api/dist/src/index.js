"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/index.ts
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const sockets_1 = require("./sockets");
const server_1 = require("./server");
const io_1 = require("./sockets/io");
const logger_1 = require("./lib/logger");
// Import worker to start email processing - REMOVED since not using queues
// import "./queues/worker";
const server = (0, http_1.createServer)(server_1.app);
const io = new socket_io_1.Server(server, { cors: { origin: ["http://localhost:3000"] } });
(0, io_1.setIO)(io);
(0, sockets_1.initSockets)(io);
// dev-only route
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => logger_1.logger.info({ port: PORT }, "API listening"));
process.on("unhandledRejection", (reason) => {
    logger_1.logger.error({ err: reason }, "Unhandled promise rejection");
});
process.on("uncaughtException", (err) => {
    logger_1.logger.fatal({ err }, "Uncaught exception");
    // Don't exit in dev automatically
    if (process.env.NODE_ENV === "production")
        process.exit(1);
});
