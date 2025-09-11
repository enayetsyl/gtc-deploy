"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSockets = initSockets;
const jwt_1 = require("../lib/jwt");
function initSockets(io) {
    // JWT auth via handshake
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token ||
            socket.handshake.query?.token;
        if (!token)
            return next(new Error("unauthorized"));
        try {
            const payload = (0, jwt_1.verifyAccessToken)(token);
            socket.data.userId = payload.sub;
            next();
        }
        catch {
            next(new Error("unauthorized"));
        }
    });
    io.on("connection", (socket) => {
        const userId = socket.data.userId;
        socket.join(`user:${userId}`);
        socket.emit("hello", { message: "connected" });
    });
}
