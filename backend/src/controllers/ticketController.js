import { GENDERS } from "../models/Ticket.js";
import { findHospitalById, findHospitalOrDefault } from "../services/hospitalService.js";
import * as queueService from "../services/queueService.js";
import ApiError from "../utils/ApiError.js";
import * as v from "../utils/validate.js";

// The only patient details we keep: first name, age, gender, optional mobile. Never Aadhaar or address.
function readPatient(body) {
  return {
    firstName: v.text(body.firstName, "First name", { required: true, max: 50 }),
    age: v.integer(body.age, "Age", { required: true, min: 0, max: 120 }),
    gender: v.oneOf(body.gender, "gender", GENDERS, { required: true }),
    mobile: v.mobile(body.mobile),
  };
}

function readAccessibility(input) {
  if (!input || typeof input !== "object") return {};
  return {
    avoidStairs: v.bool(input.avoidStairs),
    largeText: v.bool(input.largeText),
    readAloud: v.bool(input.readAloud),
    highContrast: v.bool(input.highContrast),
  };
}

// POST /api/tickets: the registration form behind the QR code at the hospital gate.
export async function createTicket(req, res) {
  const body = req.body ?? {};
  const hospital = await findHospitalOrDefault(v.text(body.hospitalCode, "hospitalCode", { max: 8 }));
  const ticket = await queueService.createTicket({
    hospital,
    departmentCode: v.text(body.departmentCode, "departmentCode", { required: true, max: 5 }),
    patient: readPatient(body),
    language: v.language(body.language),
    isAssisted: v.bool(body.isAssisted),
    helperName: v.text(body.helperName, "helperName", { max: 50 }),
    accessibility: readAccessibility(body.accessibility),
    isEmergency: v.bool(body.emergency ?? body.isEmergency),
    complaint: v.text(body.complaint, "complaint", { max: 200 }),
  });
  res.status(201).json(ticket);
}

// POST /api/tickets/counter (staff): walk-in registration for patients without a smartphone.
export async function counterRegister(req, res) {
  const body = req.body ?? {};
  const hospital = await findHospitalById(req.user.hospital);
  const ticket = await queueService.createTicket({
    hospital,
    departmentCode: v.text(body.departmentCode, "departmentCode", { required: true, max: 5 }),
    patient: readPatient(body),
    language: v.language(body.language) || "hi",
    isAssisted: true,
    helperName: v.text(body.helperName, "helperName", { max: 50 }) || "Registration counter",
    accessibility: readAccessibility(body.accessibility),
    isEmergency: v.bool(body.emergency ?? body.isEmergency),
    complaint: v.text(body.complaint, "complaint", { max: 200 }),
  });

  // Return the full printable slip immediately for counter printing
  res.status(201).json(await queueService.getTicketSlip(ticket.publicId));
}

// GET /api/tickets/:publicId: the patient's "My turn" screen (opened from the slip's QR code).
export async function getTicket(req, res) {
  res.json(await queueService.getTicketStatus(req.params.publicId));
}

// GET /api/tickets/:publicId/slip: full printable/downloadable OPD slip data
export async function getSlip(req, res) {
  res.json(await queueService.getTicketSlip(req.params.publicId));
}

// PATCH /api/tickets/:publicId/preferences: save patient accessibility/language preferences
export async function updatePreferences(req, res) {
  res.json(await queueService.updateTicketPreferences(req.params.publicId, req.body ?? {}));
}

// GET /api/tickets/lookup/:tokenNumber?hospitalCode=XYZ: "I have my slip" flow
export async function lookupTicket(req, res) {
  const hospital = await findHospitalOrDefault(typeof req.query.hospitalCode === "string" ? req.query.hospitalCode : undefined);
  res.json(await queueService.getTicketByTokenNumber(hospital.code, req.params.tokenNumber));
}

// POST /api/tickets/:publicId/urgent: "I need urgent help".
export async function raiseUrgent(req, res) {
  res.json(await queueService.raiseUrgent(req.params.publicId));
}

// POST /api/urgent { hospitalCode?, location?, note?, language? }: urgent help before having a ticket.
export async function raiseUrgentWithoutTicket(req, res) {
  const body = req.body ?? {};
  const hospital = await findHospitalOrDefault(v.text(body.hospitalCode, "hospitalCode", { max: 8 }));
  const result = await queueService.raiseUrgentWithoutTicket(hospital, {
    location: v.text(body.location, "location", { max: 120 }),
    note: v.text(body.note, "note", { max: 300 }),
    language: v.language(body.language),
  });
  res.status(201).json(result);
}

// POST /api/tickets/sync: registrations made while the phone was offline (PWA)
export async function syncOffline(req, res) {
  const { tickets } = req.body ?? {};
  if (!Array.isArray(tickets) || tickets.length === 0) throw ApiError.badRequest("tickets array is required");
  if (tickets.length > 10) throw ApiError.badRequest("At most 10 offline registrations can be synced at once");

  const results = [];
  for (const item of tickets) {
    const clientTempId = typeof item?.clientTempId === "string" ? item.clientTempId.slice(0, 64) : undefined;
    try {
      const hospital = await findHospitalOrDefault(v.text(item.hospitalCode, "hospitalCode", { max: 8 }));
      const created = await queueService.createTicket({
        hospital,
        departmentCode: v.text(item.departmentCode, "departmentCode", { required: true, max: 5 }),
        patient: readPatient(item),
        language: v.language(item.language),
      });
      results.push({ clientTempId, status: "synced", ticket: created });
    } catch (err) {
      results.push({ clientTempId, status: "failed", error: err.statusCode && err.statusCode < 500 ? err.message : "Could not register" });
    }
  }

  res.json({ synced: results });
}
