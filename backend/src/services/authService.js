import jwt from "jsonwebtoken";
import env from "../config/env.js";
import Department from "../models/Department.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, v: user.tokenVersion }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

// Returns the user for a valid token, or throws 401.
// A token is rejected once the user logs out, because logout bumps tokenVersion.
export async function verifyToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw ApiError.unauthorized("Session expired, please log in again");
  }

  const user = await User.findById(payload.sub);
  if (!user || user.tokenVersion !== payload.v) {
    throw ApiError.unauthorized("Session expired, please log in again");
  }
  return user;
}

// Simple self-registration for doctors. Open to anyone for now; to be locked down later.
export async function registerDoctor({ name, email, password, departmentCode, room }) {
  const department = await Department.findOne({ code: String(departmentCode).toUpperCase(), isActive: true });
  if (!department) throw ApiError.badRequest("Unknown department");

  if (department.rooms.length && !department.rooms.includes(room)) {
    throw ApiError.badRequest(`room must be one of: ${department.rooms.join(", ")}`);
  }

  const exists = await User.exists({ email: String(email).toLowerCase().trim() });
  if (exists) throw ApiError.conflict("An account with this email already exists");

  const user = await User.create({
    name,
    email,
    password,
    role: "doctor",
    department: department._id,
    room,
  });
  return { user, token: signToken(user) };
}

export async function login(email, password) {
  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized("Wrong email or password");
  }
  return { user, token: signToken(user) };
}

export async function logout(user) {
  await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });
}
