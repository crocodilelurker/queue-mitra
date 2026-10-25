// All configuration comes from environment variables (see backend/.env.example).
// Fails fast with a clear message when production is misconfigured.

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";
const isTest = nodeEnv === "test";

const problems = [];

const jwtSecret = process.env.JWT_SECRET || "";
if (!jwtSecret) {
  problems.push("JWT_SECRET is required (a long random string).");
} else if (isProduction && (jwtSecret.length < 32 || /change-?me/i.test(jwtSecret))) {
  problems.push(
    "JWT_SECRET must be at least 32 characters and not a placeholder in production. " +
    `Generate one with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
  );
}

const mongodbUri = process.env.MONGODB_URI || (isProduction ? "" : "mongodb://127.0.0.1:27017/queue-mitra");
if (!mongodbUri) {
  problems.push("MONGODB_URI is required in production (e.g. a MongoDB Atlas connection string).");
}

if (problems.length) {
  console.error(`\nQueue Mitra cannot start:\n${problems.map((p) => `  - ${p}`).join("\n")}\n`);
  process.exit(1);
}

// CLIENT_URL may be a comma-separated list of allowed browser origins.
// When deployed on Render, RENDER_EXTERNAL_URL is automatically populated.
const defaultOrigins = [process.env.RENDER_EXTERNAL_URL, "http://localhost:5180"].filter(Boolean);
const clientUrls = Array.from(
  new Set(
    (process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",") : defaultOrigins)
      .concat(process.env.RENDER_EXTERNAL_URL ? [process.env.RENDER_EXTERNAL_URL] : [])
      .map((s) => s.trim().replace(/\/$/, ""))
      .filter(Boolean)
  )
);

function parseTrustProxy(value) {
  if (value === undefined || value === "") return isProduction ? 1 : false;
  if (value === "true") return true;
  if (value === "false") return false;
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
}

const env = {
  nodeEnv,
  isProduction,
  isTest,
  port: Number(process.env.PORT) || 5000,
  mongodbUri,
  // Where the development fallback database (mongodb-memory-server) keeps its files.
  localDbPath: process.env.LOCAL_DB_PATH || "",
  localDbPort: Number(process.env.LOCAL_DB_PORT) || 27027,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",
  clientUrls,
  clientUrl: clientUrls[0],
  // Public URL of the patient app, used in the QR code printed on slips.
  publicAppUrl: (process.env.PUBLIC_APP_URL || process.env.RENDER_EXTERNAL_URL || clientUrls[0] || "").replace(/\/$/, ""),
  timeZone: process.env.HOSPITAL_TIMEZONE || "Asia/Kolkata",
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  // Serve ../frontend/dist from this server (default: on in production when the folder exists).
  serveFrontend: process.env.SERVE_FRONTEND ? process.env.SERVE_FRONTEND === "true" : isProduction,
  frontendDist: process.env.FRONTEND_DIST || "",
  contentSecurityPolicy: process.env.CSP !== "off",
  openRouterApiKey: process.env.OPENROUTER_API_KEY || "",
  openRouterModel: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.2-3b-instruct:free",
};

export default env;
