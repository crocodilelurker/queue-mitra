import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import env from "./config/env.js";
import { errorHandler, notFound } from "./middleware/error.js";
import authRouter from "./routes/auth.js";
import departmentsRouter from "./routes/departments.js";
import doctorRouter from "./routes/doctor.js";
import healthRouter from "./routes/health.js";
import ticketsRouter from "./routes/tickets.js";

const app = express();

app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/departments", departmentsRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/doctor", doctorRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
