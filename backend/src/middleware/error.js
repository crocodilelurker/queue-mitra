import mongoose from "mongoose";
import env from "../config/env.js";
import ApiError from "../utils/ApiError.js";

export function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl.split("?")[0]}`));
}

const FIELD_LABELS = { email: "email", code: "code", publicId: "ticket", "hospital, code": "code" };

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.statusCode || err.status || 500;
  let message = err.message || "Something went wrong";

  if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = Object.values(err.errors)
      .map((e) => (e.kind === "enum" ? `${e.path} must be one of: ${e.properties?.enumValues?.join(", ")}` : e.message))
      .join(", ");
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    const keys = Object.keys(err.keyValue || err.keyPattern || {}).filter((k) => k !== "hospital");
    const field = FIELD_LABELS[keys.join(", ")] ?? keys.join(", ");
    message = field === "email" ? "An account with this email already exists" : `This ${field || "record"} already exists`;
  } else if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Invalid JSON body";
  } else if (err.type === "entity.too.large") {
    status = 413;
    message = "Request is too large";
  }

  if (status >= 500) {
    console.error(err);
    if (env.isProduction) message = "Something went wrong. Please try again.";
  }

  if (res.headersSent) return;
  res.status(status).json({ error: message });
}
