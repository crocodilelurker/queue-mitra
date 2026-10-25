import mongoose from "mongoose";
import ApiError from "./ApiError.js";

// Small input validators: each returns the cleaned value or throws a readable 400.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function text(value, field, { required = false, min = 0, max = 200 } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw ApiError.badRequest(`${field} is required`);
    return undefined;
  }
  if (typeof value !== "string" && typeof value !== "number") throw ApiError.badRequest(`${field} must be text`);
  const s = String(value).trim().replace(/\s+/g, " ");
  if (required && !s) throw ApiError.badRequest(`${field} is required`);
  if (s.length < min) throw ApiError.badRequest(`${field} must be at least ${min} characters`);
  if (s.length > max) throw ApiError.badRequest(`${field} must be ${max} characters or fewer`);
  return s;
}

export function integer(value, field, { required = false, min = -Infinity, max = Infinity } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw ApiError.badRequest(`${field} is required`);
    return undefined;
  }
  const n = Number(value);
  if (!Number.isInteger(n)) throw ApiError.badRequest(`${field} must be a whole number`);
  if (n < min || n > max) throw ApiError.badRequest(`${field} must be between ${min} and ${max}`);
  return n;
}

export function oneOf(value, field, allowed, { required = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw ApiError.badRequest(`${field} is required`);
    return undefined;
  }
  if (!allowed.includes(value)) throw ApiError.badRequest(`${field} must be one of: ${allowed.join(", ")}`);
  return value;
}

export function email(value, { required = true } = {}) {
  const s = text(value, "email", { required, max: 120 });
  if (s === undefined) return undefined;
  if (!EMAIL_PATTERN.test(s)) throw ApiError.badRequest("Enter a valid email address");
  return s.toLowerCase();
}

export function password(value, { required = true } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw ApiError.badRequest("password is required");
    return undefined;
  }
  if (typeof value !== "string") throw ApiError.badRequest("password must be text");
  if (value.length < 8) throw ApiError.badRequest("Password must be at least 8 characters");
  if (value.length > 128) throw ApiError.badRequest("Password must be 128 characters or fewer");
  return value;
}

export function staffPin(value, { required = true } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw ApiError.badRequest("staffPin is required (4 to 6 digits)");
    return undefined;
  }
  const s = String(value).trim();
  if (!/^\d{4,6}$/.test(s)) throw ApiError.badRequest("Staff PIN must be 4 to 6 digits");
  return s;
}

// Optional Indian mobile: accepts spaces, dashes and a +91 / 0 prefix; stores 10 digits.
export function mobile(value) {
  if (value === undefined || value === null || value === "") return undefined;
  let digits = String(value).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (!/^\d{10}$/.test(digits)) throw ApiError.badRequest("Mobile number must be 10 digits");
  return digits;
}

export function language(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const s = String(value).trim().toLowerCase();
  if (!/^[a-z]{2,3}(-[a-z]{2})?$/.test(s)) throw ApiError.badRequest("language must be a language code like en, hi, te or ta");
  return s;
}

export function objectId(value, field = "id") {
  if (!mongoose.isValidObjectId(value)) throw ApiError.badRequest(`Invalid ${field}`);
  return String(value);
}

export function bool(value) {
  return value === true || value === "true";
}

export function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
