import http from "node:http";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import env from "./config/env.js";
import { initSocket } from "./socket/index.js";

const server = http.createServer(app);
initSocket(server);

await connectDB();

server.listen(env.port, () => {
  console.log(`Queue Mitra backend running on http://localhost:${env.port}`);
});
