import jwt from "jsonwebtoken";
import env from "../config/env.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { findDepartment, findHospital } from "./hospitalService.js";

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
export async function registerDoctor({ name, email, password, hospitalCode, departmentCode, room }) {
  const hospital = await findHospital(hospitalCode);
  const department = await findDepartment(hospital, departmentCode);

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
    hospital: hospital._id,
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

export async function loginWithStaffPin(hospitalCode, pin) {
  const hospital = await findHospital(hospitalCode);
  const expectedPin = hospital.staffPin || "1234";
  if (String(pin).trim() !== String(expectedPin).trim()) {
    throw ApiError.unauthorized("Invalid staff PIN for this hospital");
  }

  const staffEmail = `staff-${hospital.code.toLowerCase()}@queuemitra.test`;
  let user = await User.findOne({ email: staffEmail });
  if (!user) {
    user = await User.create({
      name: `${hospital.code} Staff Kiosk`,
      email: staffEmail,
      password: "staffPassword123!",
      role: "staff",
      hospital: hospital._id,
    });
  }

  return { user, token: signToken(user) };
}

export async function logout(user) {
  await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });
}
