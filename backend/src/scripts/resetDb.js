// Wipes the whole Queue Mitra database (hospital, departments, accounts, tickets, everything).
// The next time the app opens it shows the /setup wizard.
// Usage: npm run reset-db -- --yes
import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../config/db.js";

if (!process.argv.includes("--yes")) {
  console.error("This deletes ALL Queue Mitra data. Re-run with --yes to confirm:  npm run reset-db -- --yes");
  process.exit(1);
}

try {
  // reuseLocalFileDb: if the dev server is running on the local file database, wipe that one.
  await connectDB({ reuseLocalFileDb: true });
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
  console.log(`Database "${mongoose.connection.name}" is now empty (${collections.length} collections cleared).`);
  console.log("If the server is running, reload the app: it will open the setup wizard.");
  await disconnectDB();
  process.exit(0);
} catch (err) {
  console.error("Reset failed:", err.message);
  await disconnectDB();
  process.exit(1);
}
