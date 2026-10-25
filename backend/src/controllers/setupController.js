import Department from "../models/Department.js";
import Hospital from "../models/Hospital.js";
import User from "../models/User.js";
import { DEPARTMENT_CATALOG, OPD_ROOMS } from "../data/departmentCatalog.js";
import { hashPin, session } from "../services/authService.js";
import { emitAll } from "../socket/index.js";
import ApiError from "../utils/ApiError.js";
import * as v from "../utils/validate.js";
import { sendAuth } from "./authController.js";

export function publicHospital(h) {
  if (!h) return null;
  return {
    _id: h._id,
    code: h.code,
    name: h.name,
    type: h.type,
    address: {
      line: h.address?.line ?? "",
      city: h.address?.city ?? "",
      state: h.address?.state ?? "",
      pincode: h.address?.pincode ?? "",
    },
    contact: { phone: h.contact?.phone ?? "", emergencyPhone: h.contact?.emergencyPhone ?? "" },
    languages: h.languages,
    floors: h.floors,
  };
}

// GET /api/setup/status: is there a hospital yet? The frontend opens /setup while configured is false.
export async function getStatus(req, res) {
  const hospital = await Hospital.findOne({ isActive: true }).sort({ createdAt: 1 }).lean();
  if (!hospital) {
    return res.json({ configured: false, hospital: null, counts: { departments: 0, doctors: 0, staff: 0 } });
  }
  const [departments, doctors, staff] = await Promise.all([
    Department.countDocuments({ hospital: hospital._id, isActive: true }),
    User.countDocuments({ hospital: hospital._id, role: "doctor" }),
    User.countDocuments({ hospital: hospital._id, role: { $in: ["staff", "admin", "superadmin"] }, isKiosk: { $ne: true } }),
  ]);
  res.json({ configured: true, hospital: publicHospital(hospital), counts: { departments, doctors, staff } });
}

// GET /api/setup/catalog: department templates + the OPD rooms of the building map.
export function getCatalog(req, res) {
  res.json({ departments: DEPARTMENT_CATALOG, rooms: OPD_ROOMS });
}

// "City District Hospital" -> "CDH"; "Apollo" -> "APOLL"
export function deriveCode(name) {
  const words = name.toUpperCase().replace(/[^A-Z\s]/g, " ").split(/\s+/).filter(Boolean);
  let code = words.length >= 2 ? words.map((w) => w[0]).join("").slice(0, 5) : "";
  if (code.length < 3) code = (words.join("") + "XXX").slice(0, Math.max(3, Math.min(5, words.join("").length)));
  return code.slice(0, 5);
}

// POST /api/setup: creates the hospital and its first (super) admin. Only works on an empty database.
export async function runSetup(req, res) {
  if (await Hospital.exists({})) throw ApiError.conflict("Queue Mitra is already set up. Please sign in.");

  const body = req.body ?? {};
  const h = body.hospital ?? {};
  const a = body.admin ?? {};

  const name = v.text(h.name, "Hospital name", { required: true, min: 2, max: 120 });
  let code = v.text(h.code, "Hospital code", { max: 8 });
  if (code) {
    code = code.toUpperCase();
    if (!/^[A-Z0-9]{2,8}$/.test(code)) throw ApiError.badRequest("Hospital code must be 2 to 8 letters or digits");
  } else {
    code = deriveCode(name);
  }
  const pin = v.staffPin(body.staffPin);
  const adminName = v.text(a.name, "Your name", { required: true, min: 2, max: 80 });
  const adminEmail = v.email(a.email);
  const adminPassword = v.password(a.password);

  const pincode = v.text(h.pincode ?? h.address?.pincode, "pincode", { max: 6 });
  if (pincode && !/^\d{6}$/.test(pincode)) throw ApiError.badRequest("Pincode must be 6 digits");

  const hospital = await Hospital.create({
    code,
    name,
    address: {
      line: v.text(h.addressLine ?? h.address?.line, "address", { max: 200 }),
      city: v.text(h.city ?? h.address?.city, "city", { max: 80 }),
      state: v.text(h.state ?? h.address?.state, "state", { max: 80 }),
      pincode,
    },
    contact: {
      phone: v.text(h.phone ?? h.contact?.phone, "phone", { max: 20 }),
      emergencyPhone: v.text(h.emergencyPhone ?? h.contact?.emergencyPhone, "emergency phone", { max: 20 }),
    },
    staffPinHash: await hashPin(pin),
  });

  let admin;
  try {
    admin = await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: "superadmin",
      hospital: hospital._id,
    });
  } catch (err) {
    await Hospital.deleteOne({ _id: hospital._id }); // keep the database empty if the admin can't be created
    throw err;
  }

  emitAll("hospital:updated", { hospitalId: String(hospital._id), reason: "setup", at: new Date().toISOString() });
  sendAuth(res, 201, { ...(await session(admin)), hospital: publicHospital(hospital) });
}
