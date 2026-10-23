import { GENDERS } from "../models/Ticket.js";
import * as queueService from "../services/queueService.js";
import ApiError from "../utils/ApiError.js";

// POST /api/tickets: the registration form behind the QR code at the hospital gate.
export async function createTicket(req, res) {
  const { hospitalCode, departmentCode, firstName, age, gender, mobile, language, isAssisted, helperName, accessibility } = req.body ?? {};

  if (!hospitalCode) throw ApiError.badRequest("hospitalCode is required");
  if (!departmentCode) throw ApiError.badRequest("departmentCode is required");
  if (!firstName?.trim()) throw ApiError.badRequest("firstName is required");
  if (!Number.isInteger(Number(age))) throw ApiError.badRequest("age must be a whole number");
  if (!GENDERS.includes(gender)) throw ApiError.badRequest(`gender must be one of: ${GENDERS.join(", ")}`);

  const ticket = await queueService.createTicket({
    hospitalCode,
    departmentCode,
    patient: { firstName, age: Number(age), gender, mobile: mobile || undefined },
    language,
    isAssisted,
    helperName,
    accessibility,
  });

  res.status(201).json(ticket);
}

// POST /api/tickets/counter: Fast walk-in registration by hospital staff for patients without smartphones
export async function counterRegister(req, res) {
  const { hospitalCode = "CDH", departmentCode, firstName, age, gender, mobile, language } = req.body ?? {};

  if (!departmentCode) throw ApiError.badRequest("departmentCode is required");
  if (!firstName?.trim()) throw ApiError.badRequest("firstName is required");
  if (!Number.isInteger(Number(age))) throw ApiError.badRequest("age must be a whole number");
  if (!GENDERS.includes(gender)) throw ApiError.badRequest(`gender must be one of: ${GENDERS.join(", ")}`);

  const ticket = await queueService.createTicket({
    hospitalCode,
    departmentCode,
    patient: { firstName, age: Number(age), gender, mobile: mobile || undefined },
    language: language || "hi",
    isAssisted: true,
    helperName: "Hospital Registration Counter",
  });

  // Return the full printable slip immediately for counter printing
  const slip = await queueService.getTicketSlip(ticket.publicId);
  res.status(201).json(slip);
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

// GET /api/tickets/lookup/:tokenNumber?hospitalCode=CDH: "I have my slip" flow
export async function lookupTicket(req, res) {
  const { tokenNumber } = req.params;
  const hospitalCode = req.query.hospitalCode || "CDH";
  res.json(await queueService.getTicketByTokenNumber(hospitalCode, tokenNumber));
}

// POST /api/tickets/:publicId/urgent: "I need urgent help".
export async function raiseUrgent(req, res) {
  res.json(await queueService.raiseUrgent(req.params.publicId));
}

// POST /api/tickets/sync: PWA offline synchronization endpoint
export async function syncOffline(req, res) {
  const { tickets = [] } = req.body ?? {};
  if (!Array.isArray(tickets) || tickets.length === 0) {
    throw ApiError.badRequest("tickets array is required");
  }

  const results = [];
  for (const item of tickets) {
    try {
      const { clientTempId, hospitalCode = "CDH", departmentCode, firstName, age, gender, mobile, language } = item;
      const created = await queueService.createTicket({
        hospitalCode,
        departmentCode,
        patient: { firstName, age: Number(age), gender, mobile: mobile || undefined },
        language,
      });
      results.push({
        clientTempId,
        status: "synced",
        ticket: created,
      });
    } catch (err) {
      results.push({
        clientTempId: item.clientTempId,
        status: "failed",
        error: err.message,
      });
    }
  }

  res.json({ synced: results });
}
