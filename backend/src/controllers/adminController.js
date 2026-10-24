import { getCentralAdminOverview } from "../services/adminAnalyticsService.js";
import User from "../models/User.js";
import Department from "../models/Department.js";
import Hospital from "../models/Hospital.js";
import Patient from "../models/Patient.js";
import Appointment from "../models/Appointment.js";
import Bill from "../models/Bill.js";
import Ticket from "../models/Ticket.js";
import Counter from "../models/Counter.js";
import ApiError from "../utils/ApiError.js";

export async function handleGetOverview(req, res, next) {
  try {
    const overview = await getCentralAdminOverview("CDH");
    res.json(overview);
  } catch (err) {
    next(err);
  }
}

// ---------------- DOCTORS ----------------

export async function handleListDoctors(req, res, next) {
  try {
    const doctors = await User.find({ role: "doctor" })
      .populate("department", "code name floor rooms translations")
      .select("name email role room specialty consultationFee status department createdAt")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ doctors });
  } catch (err) {
    next(err);
  }
}

export async function handleCreateDoctor(req, res, next) {
  try {
    const { name, email, password = "doctor123", departmentCode, room = "Room 1", specialty = "General Medicine", consultationFee = 20 } = req.body ?? {};

    if (!name || !email) throw ApiError.badRequest("Doctor name and email are required");

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) throw ApiError.badRequest(`User with email ${email} already exists`);

    const hospital = await Hospital.findOne({ code: "CDH" });
    let department = null;
    if (departmentCode) {
      department = await Department.findOne({ code: departmentCode });
    }

    const doctor = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: "doctor",
      hospital: hospital?._id,
      department: department?._id,
      room,
      specialty,
      consultationFee: Number(consultationFee) || 20,
      status: { state: "available" },
    });

    res.status(201).json({ success: true, doctor });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateDoctor(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email, departmentCode, room, specialty, consultationFee, password } = req.body ?? {};

    const doctor = await User.findById(id);
    if (!doctor || doctor.role !== "doctor") throw ApiError.notFound("Doctor not found");

    if (name) doctor.name = name;
    if (email) doctor.email = email.toLowerCase();
    if (room !== undefined) doctor.room = room;
    if (specialty !== undefined) doctor.specialty = specialty;
    if (consultationFee !== undefined) doctor.consultationFee = Number(consultationFee);
    if (password) doctor.password = password;

    if (departmentCode) {
      const dept = await Department.findOne({ code: departmentCode });
      if (dept) doctor.department = dept._id;
    }

    await doctor.save();
    const updated = await User.findById(id).populate("department", "code name floor rooms translations");
    res.json({ success: true, doctor: updated });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateDoctorStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { state, delayMinutes, until, consultationFee } = req.body ?? {};

    const doctor = await User.findById(id);
    if (!doctor || doctor.role !== "doctor") throw ApiError.notFound("Doctor not found");

    if (state) doctor.status.state = state;
    if (delayMinutes !== undefined) doctor.status.delayMinutes = Number(delayMinutes);
    if (until !== undefined) doctor.status.until = until ? new Date(until) : null;
    if (consultationFee !== undefined) doctor.consultationFee = Number(consultationFee);

    await doctor.save();
    res.json({ success: true, doctor });
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteDoctor(req, res, next) {
  try {
    const { id } = req.params;
    const doctor = await User.findOneAndDelete({ _id: id, role: "doctor" });
    if (!doctor) throw ApiError.notFound("Doctor not found");
    res.json({ success: true, message: `Doctor ${doctor.name} deleted successfully` });
  } catch (err) {
    next(err);
  }
}

// ---------------- STAFF & ADMINS ----------------

export async function handleListStaff(req, res, next) {
  try {
    const staff = await User.find({ role: { $in: ["staff", "admin", "superadmin"] } })
      .populate("department", "code name floor rooms translations")
      .select("name email role hospital department createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ staff });
  } catch (err) {
    next(err);
  }
}

export async function handleCreateStaff(req, res, next) {
  try {
    const { name, email, password = "staff123", role = "staff", departmentCode } = req.body ?? {};

    if (!name || !email) throw ApiError.badRequest("Staff name and email are required");

    const validRoles = ["staff", "admin", "superadmin"];
    const assignedRole = validRoles.includes(role) ? role : "staff";

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) throw ApiError.badRequest(`User with email ${email} already exists`);

    const hospital = await Hospital.findOne({ code: "CDH" });
    let department = null;
    if (departmentCode) {
      department = await Department.findOne({ code: departmentCode });
    }

    const staffMember = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: assignedRole,
      hospital: hospital?._id,
      department: department?._id,
    });

    res.status(201).json({ success: true, staff: staffMember });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateStaff(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email, role, departmentCode, password } = req.body ?? {};

    const staffMember = await User.findById(id);
    if (!staffMember || !["staff", "admin", "superadmin"].includes(staffMember.role)) {
      throw ApiError.notFound("Staff member not found");
    }

    if (name) staffMember.name = name;
    if (email) staffMember.email = email.toLowerCase();
    if (role && ["staff", "admin", "superadmin"].includes(role)) staffMember.role = role;
    if (password) staffMember.password = password;

    if (departmentCode !== undefined) {
      if (departmentCode) {
        const dept = await Department.findOne({ code: departmentCode });
        if (dept) staffMember.department = dept._id;
      } else {
        staffMember.department = null;
      }
    }

    await staffMember.save();
    const updated = await User.findById(id).populate("department", "code name floor rooms translations");
    res.json({ success: true, staff: updated });
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteStaff(req, res, next) {
  try {
    const { id } = req.params;
    const staffMember = await User.findOneAndDelete({ _id: id, role: { $in: ["staff", "admin", "superadmin"] } });
    if (!staffMember) throw ApiError.notFound("Staff member not found");
    res.json({ success: true, message: `Staff member ${staffMember.name} deleted successfully` });
  } catch (err) {
    next(err);
  }
}

// ---------------- PURGE / RESET MOCK DATA ----------------

export async function handleResetMockData(req, res, next) {
  try {
    const [pDel, aDel, bDel, tDel, cDel] = await Promise.all([
      Patient.deleteMany({}),
      Appointment.deleteMany({}),
      Bill.deleteMany({}),
      Ticket.deleteMany({}),
      Counter.deleteMany({}),
    ]);

    res.json({
      success: true,
      message: "Database purged of all mock records.",
      deleted: {
        patients: pDel.deletedCount,
        appointments: aDel.deletedCount,
        bills: bDel.deletedCount,
        tickets: tDel.deletedCount,
        counters: cDel.deletedCount,
      },
    });
  } catch (err) {
    next(err);
  }
}
