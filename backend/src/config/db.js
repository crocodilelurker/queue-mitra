import mongoose from "mongoose";
import env from "./env.js";

export async function connectDB(uri = env.mongodbUri) {
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
