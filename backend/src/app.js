import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { corsOrigin } from "./config/cors.js";
import env from "./config/env.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { limiters } from "./middleware/rateLimit.js";
import adminRouter from "./routes/admin.js";
import analyticsRouter from "./routes/analytics.js";
import authRouter from "./routes/auth.js";
import boardRouter from "./routes/board.js";
import demoRouter from "./routes/demo.js";
import doctorRouter from "./routes/doctor.js";
import healthRouter from "./routes/health.js";
import hospitalsRouter from "./routes/hospitals.js";
import navigationRouter from "./routes/navigation.js";
import notificationsRouter from "./routes/notifications.js";
import patientsRouter from "./routes/patients.js";
import setupRouter from "./routes/setup.js";
import staffRouter from "./routes/staff.js";
import ticketsRouter from "./routes/tickets.js";
import triageRouter from "./routes/triage.js";
import urgentRouter from "./routes/urgent.js";
import voiceRouter from "./routes/voice.js";

const app = express();

app.set("trust proxy", env.trustProxy);
app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: env.contentSecurityPolicy
      ? {
          useDefaults: true,
          directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
            "img-src": ["'self'", "data:", "blob:", "https:"],
            "media-src": ["'self'", "data:", "blob:"],
            "connect-src": ["'self'", "ws:", "wss:", ...env.clientUrls],
            "worker-src": ["'self'", "blob:"],
            "upgrade-insecure-requests": env.isProduction ? [] : null,
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(compression());
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.use("/api/health", healthRouter);
app.use("/api", limiters.api);
app.use("/api/setup", setupRouter);
app.use("/api/auth", authRouter);
app.use("/api/hospitals", hospitalsRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/urgent", urgentRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/staff", staffRouter);
app.use("/api/admin", adminRouter);
app.use("/api/patients", patientsRouter);
app.use("/api/navigation", navigationRouter);
app.use("/api/triage", triageRouter);
app.use("/api/voice", voiceRouter);
app.use("/api/board", boardRouter);
app.use("/api/demo", demoRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api", notFound);

// Production: this server also hosts the built frontend (one service on Render/Railway).
if (env.serveFrontend) {
  const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const dist = env.frontendDist ? path.resolve(env.frontendDist) : path.resolve(backendRoot, "../frontend/dist");
  const indexHtml = path.join(dist, "index.html");
  if (fs.existsSync(indexHtml)) {
    app.use(
      express.static(dist, {
        index: false,
        setHeaders(res, file) {
          // Vite puts a content hash in asset file names, so they can be cached forever.
          if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        },
      })
    );
    // SPA fallback: every non-API GET returns index.html so client-side routes work on reload.
    app.get(/^(?!\/api\/|\/socket\.io\/).*/, (req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(indexHtml);
    });
    console.log(`Serving the frontend from ${dist}`);
  } else {
    console.warn(`SERVE_FRONTEND is on but ${indexHtml} was not found. Run "npm run build" in frontend/ first.`);
  }
}

app.use(notFound);
app.use(errorHandler);

export default app;
