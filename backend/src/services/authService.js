import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import env from "../config/env.js";
import Department from "../models/Department.js";
import Hospital from "../models/Hospital.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { findHospital } from "./hospitalService.js";

export function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role, v: user.tokenVersion ?? 0 }, env.jwtSecret, {
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

// What the frontend gets for the signed-in user.
export async function serializeUser(user) {
  const [department, hospital] = await Promise.all([
    user.department ? Department.findById(user.department).select("code name floor rooms").lean() : null,
    user.hospital ? Hospital.findById(user.hospital).select("code name").lean() : null,
  ]);
  return {
    _id: user._id,
    id: user._id,
    name: user.name,
    email: user.isKiosk ? null : user.email,
    role: user.role,
    isKiosk: Boolean(user.isKiosk),
    hospital: user.hospital ?? null,
    hospitalCode: hospital?.code ?? null,
    hospitalName: hospital?.name ?? null,
    department: user.department ?? null,
    departmentCode: department?.code ?? null,
    departmentName: department?.name ?? null,
    floor: department?.floor ?? null,
    room: user.room ?? null,
    specialty: user.specialty ?? null,
    status: user.role === "doctor" ? user.status : undefined,
  };
}

export async function session(user) {
  return { user: await serializeUser(user), token: signToken(user) };
}

export async function login(email, password) {
  const user = await User.findOne({ email: String(email).toLowerCase().trim(), isKiosk: { $ne: true } }).select(
    "+password"
  );
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized("Wrong email or password");
  }
  return session(user);
}

export const hashPin = (pin) => bcrypt.hash(String(pin), 10);

// Counter login with the hospital's staff PIN. Signs in as the hospital's shared counter account.
export async function loginWithStaffPin(hospitalCode, pin) {
  const hospital = await findHospital(hospitalCode, { withPin: true });
  if (!hospital.staffPinHash || !(await bcrypt.compare(String(pin).trim(), hospital.staffPinHash))) {
    throw ApiError.unauthorized("Wrong staff PIN");
  }

  let user = await User.findOne({ hospital: hospital._id, isKiosk: true });
  if (!user) {
    user = await User.create({
      name: "Registration counter",
      // Internal, never used to log in: the kiosk account can only be reached with the PIN.
      email: `counter-${hospital._id}@kiosk.invalid`,
      password: crypto.randomBytes(24).toString("hex"),
      role: "staff",
      hospital: hospital._id,
      isKiosk: true,
    });
  }
  return session(user);
}

// Changing the PIN signs out every counter screen that used the old one.
export async function setStaffPin(hospitalId, pin) {
  await Hospital.updateOne({ _id: hospitalId }, { $set: { staffPinHash: await hashPin(pin) } });
  await User.updateMany({ hospital: hospitalId, isKiosk: true }, { $inc: { tokenVersion: 1 } });
}

export async function logout(user) {
  // The counter account is shared by every PIN screen: signing out one screen must not sign out the others.
  if (user.isKiosk) return;
  await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });
}
