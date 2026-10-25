import { Router } from "express";
import Department from "../models/Department.js";
import Ticket from "../models/Ticket.js";
import User from "../models/User.js";
import { CONSOLE_ROLES, protect, requireRole } from "../middleware/auth.js";
import { serviceDate } from "../utils/date.js";
import { escapeRegex } from "../utils/validate.js";

const router = Router();

router.use(protect, requireRole(...CONSOLE_ROLES));

// GET /api/patients?search=: today's registrations (a patient = their ticket's first name, age, gender, mobile).
// search matches the token number, first name or mobile number.
router.get("/", async (req, res) => {
  const query = { hospital: req.user.hospital, serviceDate: serviceDate() };
  const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 50) : "";
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    const or = [{ tokenNumber: rx }, { "patient.firstName": rx }];
    const digits = search.replace(/\D/g, "");
    if (digits.length >= 3) or.push({ "patient.mobile": new RegExp(escapeRegex(digits)) });
    query.$or = or;
  }

  const [tickets, departments, doctors] = await Promise.all([
    Ticket.find(query).sort({ createdAt: -1 }).limit(500).lean(),
    Department.find({ hospital: req.user.hospital }).select("code name").lean(),
    User.find({ hospital: req.user.hospital, role: "doctor" }).select("name").lean(),
  ]);
  const dept = new Map(departments.map((d) => [String(d._id), d]));
  const docs = new Map(doctors.map((d) => [String(d._id), d.name]));

  const patients = tickets.map((t) => ({
    ticketId: t._id,
    publicId: t.publicId,
    tokenNumber: t.tokenNumber,
    firstName: t.patient.firstName,
    age: t.patient.age,
    gender: t.patient.gender,
    mobile: t.patient.mobile ?? null,
    language: t.language,
    departmentCode: dept.get(String(t.department))?.code ?? null,
    departmentName: dept.get(String(t.department))?.name ?? null,
    status: t.status,
    room: t.room ?? null,
    doctorName: t.doctor ? docs.get(String(t.doctor)) ?? null : null,
    assisted: Boolean(t.isAssisted),
    isEmergency: Boolean(t.isEmergency),
    complaint: t.complaint ?? null,
    urgent: Boolean(t.urgent?.raised && !t.urgent?.seenAt),
    createdAt: t.createdAt,
    calledAt: t.calledAt ?? null,
    completedAt: t.completedAt ?? null,
  }));

  res.json({ patients, total: patients.length, serviceDate: query.serviceDate });
});

export default router;
