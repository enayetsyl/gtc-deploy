// apps/api/src/index.ts
import { createServer } from "http";

import { Server } from "socket.io";
import { initSockets } from "./sockets/index.js";
import { app } from "./server";

const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
initSockets(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`API listening on :${PORT}`));
