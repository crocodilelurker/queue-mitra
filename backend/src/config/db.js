import mongoose from "mongoose";
import env from "./env.js";

let mongod = null;

export async function connectDB(uri = env.mongodbUri) {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 });
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    if (uri.includes("127.0.0.1") || uri.includes("localhost")) {
      console.log("Local MongoDB server not detected, launching in-memory MongoDB instance...");
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      mongod = await MongoMemoryServer.create();
      const memoryUri = mongod.getUri();
      await mongoose.connect(memoryUri);
      console.log(`In-memory MongoDB connected: ${memoryUri}`);

      // Auto-seed in-memory instance
      const { seedData } = await import("../scripts/seed.js");
      await seedData({ reset: true });
    } else {
      throw err;
    }
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
}
