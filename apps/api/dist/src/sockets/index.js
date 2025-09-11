"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSockets = initSockets;
function initSockets(io) {
    io.on("connection", (socket) => {
        socket.emit("hello", { message: "connected" });
    });
}
