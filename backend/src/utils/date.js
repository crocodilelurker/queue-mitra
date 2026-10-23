import env from "../config/env.js";

// Queues reset every day, so tickets are grouped by the hospital's local date (YYYY-MM-DD).
export function serviceDate(date = new Date()) {
  return date.toLocaleDateString("en-CA", { timeZone: env.timeZone });
}
