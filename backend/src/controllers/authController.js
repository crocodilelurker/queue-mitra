import jwt from "jsonwebtoken";
import env from "../config/env.js";
import * as authService from "../services/authService.js";
import ApiError from "../utils/ApiError.js";

const cookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  // The frontend may be on another domain in production (e.g. Vercel + Render).
  sameSite: env.isProduction ? "none" : "lax",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sendAuth(res, status, { user, token }) {
  const { exp } = jwt.decode(token);
  res.cookie("token", token, { ...cookieOptions, expires: new Date(exp * 1000) });
  // The token is also returned so the client can use it for Socket.io or a Bearer header.
  res.status(status).json({ user, token });
}

// POST /api/auth/register/doctor
export async function registerDoctor(req, res) {
  const { name, email, password, departmentCode, room } = req.body ?? {};

  if (!name?.trim()) throw ApiError.badRequest("name is required");
  if (!EMAIL_PATTERN.test(email ?? "")) throw ApiError.badRequest("A valid email is required");
  if (!password || password.length < 6) throw ApiError.badRequest("password must be at least 6 characters");
  if (!departmentCode) throw ApiError.badRequest("departmentCode is required");
  if (!room?.trim()) throw ApiError.badRequest("room is required");

  sendAuth(res, 201, await authService.registerDoctor({ name, email, password, departmentCode, room }));
}

export async function login(req, res) {
  const { email, password } = req.body ?? {};
  if (!email || !password) throw ApiError.badRequest("email and password are required");

  sendAuth(res, 200, await authService.login(email, password));
}

export async function logout(req, res) {
  await authService.logout(req.user);
  res.clearCookie("token", cookieOptions);
  res.json({ message: "Logged out" });
}

export function me(req, res) {
  res.json({ user: req.user });
}
