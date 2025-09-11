"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setIO = setIO;
exports.getIO = getIO;
exports.emitToUser = emitToUser;
let ioRef = null;
function setIO(io) {
    ioRef = io;
}
function getIO() {
    if (!ioRef)
        throw new Error("Socket.io not initialized");
    return ioRef;
}
function emitToUser(userId, event, payload) {
    getIO().to(`user:${userId}`).emit(event, payload);
}
