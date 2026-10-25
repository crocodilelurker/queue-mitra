import http from "node:http";
import app from "./app.js";
import { connectDB, disconnectDB } from "./config/db.js";
import env from "./config/env.js";
import { stopAutoSimulation } from "./services/demoService.js";
import { closeSocket, initSocket } from "./socket/index.js";

const server = http.createServer(app);
initSocket(server);

try {
  await connectDB();
} catch (err) {
  console.error(`\n${err.message}\n`);
  process.exit(1);
}

server.listen(env.port, () => {
  console.log(`Queue Mitra backend running on http://localhost:${env.port} (${env.nodeEnv})`);
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received: shutting down...`);
  const force = setTimeout(() => process.exit(1), 10000);
  force.unref();
  stopAutoSimulation();
  await closeSocket(); // also closes the HTTP server
  server.closeAllConnections?.();
  await disconnectDB();
  clearTimeout(force);
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (err) => console.error("Unhandled rejection:", err));
