"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/index.ts
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const sockets_1 = require("./sockets");
const server_1 = require("./server");
const server = (0, http_1.createServer)(server_1.app);
const io = new socket_io_1.Server(server, { cors: { origin: "*" } });
(0, sockets_1.initSockets)(io);
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`API listening on :${PORT}`));
