import { verifyToken } from "../services/authService.js";
import ApiError from "../utils/ApiError.js";

function readToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return req.cookies?.token ?? null;
}

// Requires a logged-in user (cookie or "Authorization: Bearer <token>").
export async function protect(req, res, next) {
  const token = readToken(req);
  if (!token) throw ApiError.unauthorized();
  req.user = await verifyToken(token);
  if (!req.user.hospital) throw ApiError.forbidden("This account is not linked to a hospital");
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) throw ApiError.forbidden("Your account cannot do this");
    next();
  };
}

export const ADMIN_ROLES = ["admin", "superadmin"];
export const CONSOLE_ROLES = ["doctor", "staff", "admin", "superadmin"];
