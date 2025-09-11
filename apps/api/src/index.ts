// apps/api/src/index.ts
import { createServer } from "http";
import { Server } from "socket.io";
import { initSockets } from "./sockets";
import { app } from "./server";
import { setIO } from "./sockets/io";


const server = createServer(app);
const io = new Server(server, { cors: { origin: ["http://localhost:3000"] } });
setIO(io);
initSockets(io);


// dev-only route
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`API listening on :${PORT}`));
