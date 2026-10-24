const required = ["MONGODB_URI", "JWT_SECRET"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  timeZone: process.env.HOSPITAL_TIMEZONE || "Asia/Kolkata",
  openRouterApiKey: process.env.OPENROUTER_API_KEY || "",
  openRouterModel: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.2-3b-instruct:free",
};

env.isProduction = env.nodeEnv === "production";

export default env;
