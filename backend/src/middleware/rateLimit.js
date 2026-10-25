import { rateLimit } from "express-rate-limit";
import env from "../config/env.js";

// Limits are per client IP. Development is 10x more generous (every local request shares one IP).
const scale = env.isProduction ? 1 : 10;

function limiter(windowMinutes, max, message) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: max * scale,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: message },
  });
}

export const limiters = {
  login: limiter(15, 20, "Too many sign-in attempts. Please wait a few minutes and try again."),
  staffPin: limiter(15, 15, "Too many PIN attempts. Please wait a few minutes and try again."),
  setup: limiter(60, 20, "Too many setup attempts. Please wait and try again."),
  tickets: limiter(10, 60, "Too many registrations from this device. Please ask at the registration counter."),
  urgent: limiter(10, 30, "Too many help requests from this device. Please ask the nearest staff member."),
  api: limiter(1, 600, "Too many requests. Please slow down."),
};
