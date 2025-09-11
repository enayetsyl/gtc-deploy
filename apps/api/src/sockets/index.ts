import type { Server } from "socket.io";
import { verifyAccessToken } from "../lib/jwt";

export function initSockets(io: Server) {
  // JWT auth via handshake
  io.use((socket, next) => {
    const token =
      (socket.handshake.auth as any)?.token ||
      (socket.handshake.query?.token as string | undefined);
    if (!token) return next(new Error("unauthorized"));
    try {
      const payload = verifyAccessToken(token);
      (socket.data as any).userId = payload.sub;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = (socket.data as any).userId as string;
    socket.join(`user:${userId}`);
    socket.emit("hello", { message: "connected" });
  });
}
