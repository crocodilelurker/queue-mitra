import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import env from "./config/env.js";
import { errorHandler, notFound } from "./middleware/error.js";
import analyticsRouter from "./routes/analytics.js";
import authRouter from "./routes/auth.js";
import boardRouter from "./routes/board.js";
import demoRouter from "./routes/demo.js";
import doctorRouter from "./routes/doctor.js";
import healthRouter from "./routes/health.js";
import hospitalsRouter from "./routes/hospitals.js";
import navigationRouter from "./routes/navigation.js";
import notificationsRouter from "./routes/notifications.js";
import ticketsRouter from "./routes/tickets.js";
import triageRouter from "./routes/triage.js";
import voiceRouter from "./routes/voice.js";
import patientsRouter from "./routes/patients.js";
import appointmentsRouter from "./routes/appointments.js";
import billingRouter from "./routes/billing.js";
import adminRouter from "./routes/admin.js";

const app = express();

app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/hospitals", hospitalsRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/navigation", navigationRouter);
app.use("/api/triage", triageRouter);
app.use("/api/voice", voiceRouter);
app.use("/api/board", boardRouter);
app.use("/api/demo", demoRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/patients", patientsRouter);
app.use("/api/appointments", appointmentsRouter);
app.use("/api/billing", billingRouter);
app.use("/api/admin", adminRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
