import mongoose from "mongoose";
import { catalogEntry, resolveRoom } from "../data/departmentCatalog.js";
import Counter from "../models/Counter.js";
import Department from "../models/Department.js";
import Hospital, { LANGUAGES } from "../models/Hospital.js";
import Notification from "../models/Notification.js";
import Ticket from "../models/Ticket.js";
import UrgentFlag from "../models/UrgentFlag.js";
import User from "../models/User.js";
import { setStaffPin } from "../services/authService.js";
import { stopAutoSimulation } from "../services/demoService.js";
import { buildStaffOverview, serializeDoctor } from "../services/overviewService.js";
import { broadcastQueue } from "../services/queueService.js";
import { emit, emitAll, notifyHospital, rooms } from "../socket/index.js";
import ApiError from "../utils/ApiError.js";
import { serviceDate } from "../utils/date.js";
import * as v from "../utils/validate.js";
import { publicHospital } from "./setupController.js";

const STAFF_ACCOUNT_ROLES = ["staff", "admin", "superadmin"];
const ASSIGNABLE_STAFF_ROLES = ["staff", "admin"];

const hid = (req) => req.user.hospital;

function changed(req, reason, event, payload = {}) {
  const hospitalId = hid(req);
  if (event) emit([rooms.staff(hospitalId), rooms.board(hospitalId)], event, { reason, ...payload });
  notifyHospital(hospitalId, reason);
}

// ---------------- OVERVIEW ----------------

// GET /api/admin/overview
export async function getOverview(req, res) {
  const overview = await buildStaffOverview(hid(req));
  const [hospital, doctors, departments] = await Promise.all([
    Hospital.findById(hid(req)).lean(),
    User.find({ hospital: hid(req), role: "doctor" }).sort({ name: 1 }).lean(),
    Department.find({ hospital: hid(req) }).lean(),
  ]);
  const deptById = new Map(departments.map((d) => [String(d._id), d]));
  res.json({
    hospital: publicHospital(hospital),
    generatedAt: overview.generatedAt,
    totals: overview.totals,
    urgent: overview.urgent,
    departments: overview.departments,
    doctors: doctors.map((d) => serializeDoctor(d, deptById)),
  });
}

// ---------------- HOSPITAL ----------------

// PATCH /api/admin/hospital
export async function updateHospital(req, res) {
  const body = req.body ?? {};
  const hospital = await Hospital.findById(hid(req));
  if (!hospital) throw ApiError.notFound("Hospital not found");

  const name = v.text(body.name, "Hospital name", { min: 2, max: 120 });
  if (name) hospital.name = name;

  const address = body.address ?? {};
  const addressFields = {
    line: address.line ?? body.addressLine,
    city: address.city ?? body.city,
    state: address.state ?? body.state,
    pincode: address.pincode ?? body.pincode,
  };
  for (const [key, value] of Object.entries(addressFields)) {
    if (value === undefined) continue;
    const clean = v.text(value, key, { max: key === "line" ? 200 : 80 });
    if (key === "pincode" && clean && !/^\d{6}$/.test(clean)) throw ApiError.badRequest("Pincode must be 6 digits");
    hospital.set(`address.${key}`, clean ?? undefined);
  }

  const contact = body.contact ?? {};
  const contactFields = { phone: contact.phone ?? body.phone, emergencyPhone: contact.emergencyPhone ?? body.emergencyPhone };
  for (const [key, value] of Object.entries(contactFields)) {
    if (value === undefined) continue;
    hospital.set(`contact.${key}`, v.text(value, key, { max: 20 }) ?? undefined);
  }

  if (body.languages !== undefined) {
    if (!Array.isArray(body.languages) || !body.languages.length || body.languages.some((l) => !LANGUAGES.includes(l))) {
      throw ApiError.badRequest(`languages must be a list from: ${LANGUAGES.join(", ")}`);
    }
    hospital.languages = [...new Set(body.languages)];
  }

  await hospital.save();
  if (body.staffPin !== undefined) await setStaffPin(hospital._id, v.staffPin(body.staffPin));

  changed(req, "hospital:updated");
  res.json({ hospital: publicHospital(hospital), staffPinChanged: body.staffPin !== undefined });
}

// ---------------- DEPARTMENTS ----------------

function cleanTranslations(input, fallback) {
  const out = {};
  for (const lang of ["hi", "te", "ta"]) {
    const t = input?.[lang] ?? {};
    const name = v.text(t.name, `${lang} name`, { max: 80 }) ?? fallback?.[lang]?.name;
    const description = v.text(t.description, `${lang} description`, { max: 200 }) ?? fallback?.[lang]?.description;
    if (name || description) out[lang] = { name, description };
  }
  return out;
}

function cleanOpdHours(input) {
  if (!input) return undefined;
  const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
  const start = input.start ?? "09:00";
  const end = input.end ?? "14:00";
  if (!hhmm.test(start) || !hhmm.test(end)) throw ApiError.badRequest("opdHours must look like 09:00");
  return { start, end };
}

// Rooms must be OPD rooms of the building map, each used by one active department only.
async function cleanRooms(hospitalId, input, exceptDepartmentId) {
  const list = Array.isArray(input) ? input : input ? [input] : [];
  if (list.length > 8) throw ApiError.badRequest("A department can have at most 8 rooms");
  const rooms = [];
  for (const value of list) {
    const room = resolveRoom(value);
    if (!room) throw ApiError.badRequest(`"${value}" is not an OPD room in this building. Pick one of the listed rooms.`);
    if (!rooms.includes(room.name)) rooms.push(room.name);
  }
  if (rooms.length) {
    const clash = await Department.findOne({
      hospital: hospitalId,
      isActive: true,
      rooms: { $in: rooms },
      ...(exceptDepartmentId ? { _id: { $ne: exceptDepartmentId } } : {}),
    }).lean();
    if (clash) {
      const room = clash.rooms.find((r) => rooms.includes(r));
      throw ApiError.conflict(`${room} is already used by ${clash.name}`);
    }
  }
  return rooms;
}

function floorOfRooms(rooms) {
  const first = rooms.map(resolveRoom).find(Boolean);
  return first?.floor;
}

async function departmentView(dept) {
  const doctorCount = await User.countDocuments({ hospital: dept.hospital, role: "doctor", department: dept._id });
  const obj = typeof dept.toObject === "function" ? dept.toObject() : dept;
  return { ...obj, doctorCount, isActive: obj.isActive !== false };
}

// GET /api/admin/departments
export async function listDepartments(req, res) {
  const departments = await Department.find({ hospital: hid(req) }).sort({ isActive: -1, floor: 1, code: 1 }).lean();
  const counts = await User.aggregate([
    { $match: { hospital: new mongoose.Types.ObjectId(String(hid(req))), role: "doctor", department: { $ne: null } } },
    { $group: { _id: "$department", n: { $sum: 1 } } },
  ]);
  const byDept = new Map(counts.map((c) => [String(c._id), c.n]));
  res.json({
    departments: departments.map((d) => ({ ...d, doctorCount: byDept.get(String(d._id)) ?? 0, isActive: d.isActive !== false })),
  });
}

// POST /api/admin/departments
export async function createDepartment(req, res) {
  const body = req.body ?? {};
  const code = v.text(body.code, "Department code", { required: true, max: 5 }).toUpperCase();
  if (!/^[A-Z]{2,5}$/.test(code)) throw ApiError.badRequest("Department code must be 2 to 5 letters (it starts every token, e.g. MED-001)");
  const template = catalogEntry(code);

  const existing = await Department.findOne({ hospital: hid(req), code });
  if (existing?.isActive) throw ApiError.conflict(`A department with code ${code} already exists`);

  const name = v.text(body.name, "Department name", { max: 80 }) ?? template?.name;
  if (!name) throw ApiError.badRequest("Department name is required");

  const rooms = await cleanRooms(hid(req), body.rooms ?? body.room ?? template?.suggestedRoom, existing?._id);
  const fields = {
    hospital: hid(req),
    code,
    name,
    description: v.text(body.description, "description", { max: 200 }) ?? template?.description ?? "",
    icon: v.text(body.icon, "icon", { max: 40 }) ?? template?.icon ?? "stethoscope",
    rooms,
    floor: v.integer(body.floor, "floor", { min: 0, max: 20 }) ?? floorOfRooms(rooms) ?? template?.floor ?? 0,
    avgConsultMinutes: v.integer(body.avgConsultMinutes, "avgConsultMinutes", { min: 1, max: 120 }) ?? template?.avgConsultMinutes ?? 8,
    seatingCapacity: v.integer(body.seatingCapacity, "seatingCapacity", { min: 1, max: 1000 }) ?? template?.seatingCapacity ?? 15,
    translations: cleanTranslations(body.translations, template?.translations),
    opdHours: cleanOpdHours(body.opdHours) ?? { start: "09:00", end: "14:00" },
    isActive: true,
  };

  let department;
  if (existing) {
    // Re-adding a department that was removed earlier brings it back (its old tickets keep their link).
    existing.set(fields);
    department = await existing.save();
  } else {
    department = await Department.create(fields);
  }

  changed(req, "department:created", "departments:updated", { departmentId: department._id });
  res.status(201).json({ department: await departmentView(department) });
}

// PATCH /api/admin/departments/:id
export async function updateDepartment(req, res) {
  v.objectId(req.params.id, "department id");
  const department = await Department.findOne({ _id: req.params.id, hospital: hid(req) });
  if (!department) throw ApiError.notFound("Department not found");
  const body = req.body ?? {};

  if (body.code !== undefined) {
    const code = v.text(body.code, "Department code", { required: true, max: 5 }).toUpperCase();
    if (!/^[A-Z]{2,5}$/.test(code)) throw ApiError.badRequest("Department code must be 2 to 5 letters");
    if (code !== department.code) {
      if (await Ticket.exists({ department: department._id })) {
        throw ApiError.conflict("The code can't change after patients have registered (it is printed on their tokens)");
      }
      if (await Department.exists({ hospital: hid(req), code, _id: { $ne: department._id } })) {
        throw ApiError.conflict(`A department with code ${code} already exists`);
      }
      department.code = code;
    }
  }

  const name = v.text(body.name, "Department name", { min: 1, max: 80 });
  if (name) department.name = name;
  if (body.description !== undefined) department.description = v.text(body.description, "description", { max: 200 }) ?? "";
  if (body.icon !== undefined) department.icon = v.text(body.icon, "icon", { max: 40 }) ?? "stethoscope";
  if (body.isActive !== undefined) department.isActive = v.bool(body.isActive);
  if (body.rooms !== undefined || body.room !== undefined) {
    department.rooms = await cleanRooms(hid(req), body.rooms ?? body.room, department._id);
    if (body.floor === undefined) department.floor = floorOfRooms(department.rooms) ?? department.floor;
  } else if (department.isActive && body.isActive !== undefined) {
    await cleanRooms(hid(req), department.rooms, department._id); // re-activating: rooms must still be free
  }
  if (body.floor !== undefined) department.floor = v.integer(body.floor, "floor", { min: 0, max: 20 });
  if (body.avgConsultMinutes !== undefined) {
    department.avgConsultMinutes = v.integer(body.avgConsultMinutes, "avgConsultMinutes", { required: true, min: 1, max: 120 });
  }
  if (body.seatingCapacity !== undefined) {
    department.seatingCapacity = v.integer(body.seatingCapacity, "seatingCapacity", { required: true, min: 1, max: 1000 });
  }
  if (body.translations !== undefined) {
    department.translations = cleanTranslations(body.translations, department.translations?.toObject?.() ?? department.translations);
  }
  if (body.opdHours !== undefined) department.opdHours = cleanOpdHours(body.opdHours);

  await department.save();
  await broadcastQueue(department._id, "department:updated");
  changed(req, "department:updated", "departments:updated", { departmentId: department._id });
  res.json({ department: await departmentView(department) });
}

// DELETE /api/admin/departments/:id: removed for good if never used, otherwise deactivated.
export async function deleteDepartment(req, res) {
  v.objectId(req.params.id, "department id");
  const department = await Department.findOne({ _id: req.params.id, hospital: hid(req) });
  if (!department) throw ApiError.notFound("Department not found");

  const active = await Ticket.countDocuments({ department: department._id, serviceDate: serviceDate(), status: { $in: ["waiting", "called"] } });
  if (active) throw ApiError.conflict(`${active} patient(s) are still in the ${department.name} queue today. Transfer or finish them first.`);

  let deactivated = false;
  if (await Ticket.exists({ department: department._id })) {
    department.isActive = false;
    await department.save();
    deactivated = true;
  } else {
    await department.deleteOne();
  }
  // Its doctors stay as accounts but are no longer assigned to a room.
  await User.updateMany({ hospital: hid(req), department: department._id }, { $set: { department: null, room: null } });

  changed(req, "department:deleted", "departments:updated", { departmentId: department._id });
  res.json({ ok: true, deactivated });
}

// ---------------- DOCTORS ----------------

async function resolveDoctorPlacement(hospitalId, departmentCode, room, { required }) {
  if (!departmentCode) {
    if (required) throw ApiError.badRequest("departmentCode is required");
    return null;
  }
  const department = await Department.findOne({
    hospital: hospitalId,
    code: String(departmentCode).trim().toUpperCase(),
    isActive: true,
  });
  if (!department) throw ApiError.badRequest(`Department ${departmentCode} does not exist. Add it first.`);

  let roomName = department.rooms[0] ?? null;
  if (room) {
    const resolved = resolveRoom(room);
    if (!resolved) throw ApiError.badRequest(`"${room}" is not an OPD room in this building`);
    if (department.rooms.length && !department.rooms.includes(resolved.name)) {
      throw ApiError.badRequest(`${department.name} uses ${department.rooms.join(", ")}. Pick one of those rooms.`);
    }
    roomName = resolved.name;
  }
  if (!roomName) throw ApiError.badRequest(`${department.name} has no room yet. Give the department a room first.`);
  return { department, room: roomName };
}

async function doctorView(doctor) {
  const dept = doctor.department ? await Department.findById(doctor.department).lean() : null;
  return serializeDoctor(doctor.toObject ? doctor.toObject() : doctor, new Map(dept ? [[String(dept._id), dept]] : []));
}

async function assertEmailFree(email, exceptId) {
  const exists = await User.exists({ email, ...(exceptId ? { _id: { $ne: exceptId } } : {}) });
  if (exists) throw ApiError.conflict("An account with this email already exists");
}

function doctorsChanged(req, departmentIds) {
  for (const id of new Set(departmentIds.filter(Boolean).map(String))) broadcastQueue(id, "doctor:updated");
  changed(req, "doctor:updated", "doctors:updated");
}

// GET /api/admin/doctors
export async function listDoctors(req, res) {
  const [doctors, departments] = await Promise.all([
    User.find({ hospital: hid(req), role: "doctor" }).sort({ name: 1 }).lean(),
    Department.find({ hospital: hid(req) }).lean(),
  ]);
  const deptById = new Map(departments.map((d) => [String(d._id), d]));
  res.json({ doctors: doctors.map((d) => serializeDoctor(d, deptById)) });
}

// POST /api/admin/doctors
export async function createDoctor(req, res) {
  const body = req.body ?? {};
  const name = v.text(body.name, "Doctor name", { required: true, min: 2, max: 80 });
  const email = v.email(body.email);
  const password = v.password(body.password);
  const specialty = v.text(body.specialty, "specialty", { max: 80 });
  const placement = await resolveDoctorPlacement(hid(req), body.departmentCode, body.room, { required: true });
  await assertEmailFree(email);

  const doctor = await User.create({
    name,
    email,
    password,
    role: "doctor",
    hospital: hid(req),
    department: placement.department._id,
    room: placement.room,
    specialty: specialty ?? placement.department.name,
    status: { state: "available" },
  });

  doctorsChanged(req, [placement.department._id]);
  res.status(201).json({ doctor: await doctorView(doctor) });
}

// PATCH /api/admin/doctors/:id
export async function updateDoctor(req, res) {
  v.objectId(req.params.id, "doctor id");
  const doctor = await User.findOne({ _id: req.params.id, hospital: hid(req), role: "doctor" });
  if (!doctor) throw ApiError.notFound("Doctor not found");
  const body = req.body ?? {};
  const oldDepartment = doctor.department;

  const name = v.text(body.name, "Doctor name", { min: 2, max: 80 });
  if (name) doctor.name = name;
  if (body.email !== undefined) {
    const email = v.email(body.email);
    await assertEmailFree(email, doctor._id);
    doctor.email = email;
  }
  const password = v.password(body.password, { required: false });
  if (password) doctor.password = password;
  if (body.specialty !== undefined) doctor.specialty = v.text(body.specialty, "specialty", { max: 80 }) ?? null;

  if (body.departmentCode !== undefined || body.room !== undefined) {
    const deptCode = body.departmentCode ?? (await Department.findById(doctor.department).lean())?.code;
    const placement = await resolveDoctorPlacement(hid(req), deptCode, body.room, { required: true });
    doctor.department = placement.department._id;
    doctor.room = placement.room;
  }

  if (body.status?.state !== undefined || body.state !== undefined) {
    const state = v.oneOf(body.status?.state ?? body.state, "state", ["available", "on_break", "running_late", "offline"], { required: true });
    doctor.status = { state, until: null, delayMinutes: 0 };
  }

  await doctor.save();
  if (password) await User.updateOne({ _id: doctor._id }, { $inc: { tokenVersion: 1 } }); // new password signs out old sessions

  doctorsChanged(req, [oldDepartment, doctor.department]);
  res.json({ doctor: await doctorView(doctor) });
}

// DELETE /api/admin/doctors/:id
export async function deleteDoctor(req, res) {
  v.objectId(req.params.id, "doctor id");
  const doctor = await User.findOneAndDelete({ _id: req.params.id, hospital: hid(req), role: "doctor" });
  if (!doctor) throw ApiError.notFound("Doctor not found");
  doctorsChanged(req, [doctor.department]);
  res.json({ ok: true });
}

// ---------------- STAFF & ADMINS ----------------

const staffView = (u) => ({ _id: u._id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt });

// GET /api/admin/staff
export async function listStaff(req, res) {
  const staff = await User.find({ hospital: hid(req), role: { $in: STAFF_ACCOUNT_ROLES }, isKiosk: { $ne: true } })
    .sort({ role: -1, name: 1 })
    .lean();
  res.json({ staff: staff.map(staffView) });
}

// POST /api/admin/staff
export async function createStaff(req, res) {
  const body = req.body ?? {};
  const name = v.text(body.name, "Name", { required: true, min: 2, max: 80 });
  const email = v.email(body.email);
  const password = v.password(body.password);
  const role = v.oneOf(body.role ?? "staff", "role", ASSIGNABLE_STAFF_ROLES, { required: true });
  await assertEmailFree(email);

  const user = await User.create({ name, email, password, role, hospital: hid(req) });
  changed(req, "staff:updated", "staff:updated");
  res.status(201).json({ staff: staffView(user), user: staffView(user) });
}

async function findStaffTarget(req) {
  v.objectId(req.params.id, "staff id");
  const user = await User.findOne({ _id: req.params.id, hospital: hid(req), role: { $in: STAFF_ACCOUNT_ROLES }, isKiosk: { $ne: true } });
  if (!user) throw ApiError.notFound("Staff member not found");
  if (user.role === "superadmin" && req.user.role !== "superadmin") {
    throw ApiError.forbidden("Only the main administrator can change this account");
  }
  return user;
}

// PATCH /api/admin/staff/:id
export async function updateStaff(req, res) {
  const user = await findStaffTarget(req);
  const body = req.body ?? {};

  const name = v.text(body.name, "Name", { min: 2, max: 80 });
  if (name) user.name = name;
  if (body.email !== undefined) {
    const email = v.email(body.email);
    await assertEmailFree(email, user._id);
    user.email = email;
  }
  if (body.role !== undefined && body.role !== user.role) {
    if (user.role === "superadmin") throw ApiError.badRequest("The main administrator's role can't be changed");
    if (String(user._id) === String(req.user._id)) throw ApiError.badRequest("You can't change your own role");
    user.role = v.oneOf(body.role, "role", ASSIGNABLE_STAFF_ROLES, { required: true });
  }
  const password = v.password(body.password, { required: false });
  if (password) user.password = password;

  await user.save();
  if (password && String(user._id) !== String(req.user._id)) await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });

  changed(req, "staff:updated", "staff:updated");
  res.json({ staff: staffView(user), user: staffView(user) });
}

// DELETE /api/admin/staff/:id
export async function deleteStaff(req, res) {
  const user = await findStaffTarget(req);
  if (String(user._id) === String(req.user._id)) throw ApiError.badRequest("You can't delete your own account");
  if (user.role === "superadmin") throw ApiError.badRequest("The main administrator can't be deleted (use factory reset)");
  await user.deleteOne();
  changed(req, "staff:updated", "staff:updated");
  res.json({ ok: true });
}

// ---------------- RESETS ----------------

// POST /api/admin/reset-queue: a fresh day. Keeps the hospital, departments and people.
export async function resetQueue(req, res) {
  const hospital = await Hospital.findById(hid(req));
  if (!hospital) throw ApiError.notFound("Hospital not found");
  stopAutoSimulation(String(hospital._id));

  const date = serviceDate();
  const tickets = await Ticket.find({ hospital: hospital._id, serviceDate: date }).select("_id publicId").lean();
  const ticketIds = tickets.map((t) => t._id);

  const [deletedTickets, , deletedFlags] = await Promise.all([
    Ticket.deleteMany({ _id: { $in: ticketIds } }),
    Notification.deleteMany({ ticket: { $in: ticketIds } }),
    UrgentFlag.deleteMany({ hospital: hospital._id }),
    Counter.deleteMany({ _id: { $regex: `^${v.escapeRegex(hospital.code)}:.*:${date}$` } }),
  ]);
  await User.updateMany(
    { hospital: hospital._id, role: "doctor", "status.state": { $in: ["on_break", "running_late"] } },
    { $set: { "status.state": "available", "status.until": null, "status.delayMinutes": 0 } }
  );

  for (const t of tickets) {
    emit(rooms.ticket(t.publicId), "ticket:updated", { publicId: t.publicId, status: "cancelled", reason: "queue_reset" });
  }
  const departments = await Department.find({ hospital: hospital._id, isActive: true }).select("_id").lean();
  await Promise.all(departments.map((d) => broadcastQueue(d._id, "queue:reset")));
  emit([rooms.staff(hospital._id), rooms.board(hospital._id)], "queue:reset", { at: new Date().toISOString() });
  notifyHospital(hospital._id, "queue:reset");

  res.json({ ok: true, deleted: { tickets: deletedTickets.deletedCount, urgentFlags: deletedFlags.deletedCount } });
}

// POST /api/admin/factory-reset (superadmin) { confirm: <hospital code> }: empties the whole database.
export async function factoryReset(req, res) {
  const hospital = await Hospital.findById(hid(req));
  if (!hospital) throw ApiError.notFound("Hospital not found");
  const confirm = String(req.body?.confirm ?? "").trim().toUpperCase();
  if (confirm !== hospital.code) {
    throw ApiError.badRequest(`Type the hospital code (${hospital.code}) to confirm the factory reset`);
  }

  stopAutoSimulation();
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) await collection.deleteMany({});

  emitAll("system:reset", { at: new Date().toISOString() });
  emitAll("hospital:updated", { reason: "factory-reset", at: new Date().toISOString() });
  res.clearCookie("token");
  res.json({ ok: true });
}
