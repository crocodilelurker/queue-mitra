import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import env from "./env.js";

// The database is NEVER seeded automatically. A fresh database means the app opens the /setup wizard.

const DB_NAME = "queue-mitra";
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const localDbPath = env.localDbPath ? path.resolve(env.localDbPath) : path.join(backendRoot, ".data", "db");

let mongod = null;
let mode = "none"; // "uri" | "local-file" | "none"

const isLocalUri = (uri) => /mongodb:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0)(:|\/|$)/.test(uri);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tryConnect(uri, options = {}) {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500, ...options });
    return true;
  } catch {
    await mongoose.disconnect().catch(() => {});
    return false;
  }
}

// Development fallback when no MongoDB is installed: a real mongod (mongodb-memory-server) that stores
// its files in backend/.data/db, so everything survives restarts.
async function startLocalFileDb() {
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  fs.mkdirSync(localDbPath, { recursive: true });

  let lastErr;
  // After a quick restart (node --watch) the previous mongod may still be releasing the files.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      mongod = await MongoMemoryServer.create({
        instance: { dbPath: localDbPath, storageEngine: "wiredTiger", port: env.localDbPort, dbName: DB_NAME },
      });
      return mongod.getUri();
    } catch (err) {
      lastErr = err;
      await sleep(1000);
    }
  }
  throw lastErr;
}

/**
 * Connects to MONGODB_URI. In development only, if that is a local address with no server running,
 * falls back to a local file-backed mongod. In production a reachable MONGODB_URI is required.
 * @param {{ reuseLocalFileDb?: boolean }} options reuseLocalFileDb: first try the file-backed mongod of a
 *   running dev server (used by scripts such as reset-db so they don't fight over the data folder).
 */
export async function connectDB({ reuseLocalFileDb = false } = {}) {
  const uri = env.mongodbUri;

  if (await tryConnect(uri)) {
    mode = "uri";
    console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
    return mode;
  }

  if (env.isProduction || !isLocalUri(uri)) {
    throw new Error(
      `Could not connect to MongoDB at MONGODB_URI. ${
        env.isProduction ? "Production needs a reachable database (e.g. MongoDB Atlas)." : "Check the connection string."
      }`
    );
  }

  if (reuseLocalFileDb && (await tryConnect(`mongodb://127.0.0.1:${env.localDbPort}/`, { dbName: DB_NAME, serverSelectionTimeoutMS: 1500 }))) {
    mode = "local-file";
    console.log(`Connected to the running local database on port ${env.localDbPort}`);
    return mode;
  }

  console.log("No MongoDB server found at MONGODB_URI: starting the local development database...");
  const localUri = await startLocalFileDb();
  await mongoose.connect(localUri, { dbName: DB_NAME });
  mode = "local-file";
  console.log(`Local development database ready (data kept in ${path.relative(process.cwd(), localDbPath) || localDbPath})`);
  return mode;
}

export function dbStatus() {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  return { state: states[mongoose.connection.readyState] ?? "unknown", mode };
}

export async function disconnectDB() {
  await mongoose.disconnect().catch(() => {});
  if (mongod) {
    // doCleanup: false keeps the data folder.
    await mongod.stop({ doCleanup: false, force: false }).catch(() => {});
    mongod = null;
  }
}
