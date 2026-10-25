import jwt from "jsonwebtoken";
import env from "../config/env.js";
import * as authService from "../services/authService.js";
import ApiError from "../utils/ApiError.js";

export const cookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  // The frontend may be on another domain in production (e.g. Vercel + Render).
  sameSite: env.isProduction ? "none" : "lax",
};

export function sendAuth(res, status, { user, token, ...rest }) {
  const { exp } = jwt.decode(token);
  res.cookie("token", token, { ...cookieOptions, expires: new Date(exp * 1000) });
  // The token is also returned so the client can use it for Socket.io or a Bearer header.
  res.status(status).json({ user, token, ...rest });
}

export async function login(req, res) {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    throw ApiError.badRequest("Email and password are required");
  }
  sendAuth(res, 200, await authService.login(email, password));
}

export async function loginStaffPin(req, res) {
  const { hospitalCode, pin } = req.body ?? {};
  if (!hospitalCode || typeof hospitalCode !== "string") throw ApiError.badRequest("hospitalCode is required");
  if (pin === undefined || pin === null || !/^\d{4,6}$/.test(String(pin).trim())) {
    throw ApiError.badRequest("Enter the 4 to 6 digit staff PIN");
  }
  sendAuth(res, 200, await authService.loginWithStaffPin(hospitalCode, pin));
}

export async function logout(req, res) {
  await authService.logout(req.user);
  res.clearCookie("token", cookieOptions);
  res.json({ message: "Logged out" });
}

export async function me(req, res) {
  res.json({ user: await authService.serializeUser(req.user) });
}
