import env from "./env.js";

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

// Allowed browser origins: CLIENT_URL (comma-separated). In development any localhost port is allowed too.
// Requests without an Origin header (same-origin, curl, the Vite proxy) are always allowed.
export function corsOrigin(origin, callback) {
  if (!origin) return callback(null, true);
  const clean = origin.replace(/\/$/, "");
  if (env.clientUrls.includes(clean) || (!env.isProduction && LOCAL_ORIGIN.test(clean))) {
    return callback(null, true);
  }
  return callback(null, false);
}
