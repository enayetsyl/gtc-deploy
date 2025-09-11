// apps/api/src/sockets/index.ts
import type { Server } from "socket.io";
export function initSockets(io: Server) {
  io.on("connection", (socket) => {
    socket.emit("hello", { message: "connected" });
  });
}
