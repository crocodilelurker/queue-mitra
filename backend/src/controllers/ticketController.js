import { GENDERS } from "../models/Ticket.js";
import * as queueService from "../services/queueService.js";
import ApiError from "../utils/ApiError.js";

// POST /api/tickets: the registration form behind the QR code at the hospital gate.
export async function createTicket(req, res) {
  const { departmentCode, firstName, age, gender, mobile, language } = req.body ?? {};

  if (!departmentCode) throw ApiError.badRequest("departmentCode is required");
  if (!firstName?.trim()) throw ApiError.badRequest("firstName is required");
  if (!Number.isInteger(Number(age))) throw ApiError.badRequest("age must be a whole number");
  if (!GENDERS.includes(gender)) throw ApiError.badRequest(`gender must be one of: ${GENDERS.join(", ")}`);

  const ticket = await queueService.createTicket({
    departmentCode,
    patient: { firstName, age: Number(age), gender, mobile: mobile || undefined },
    language,
  });

  res.status(201).json(ticket);
}

// GET /api/tickets/:publicId: the patient's "My turn" screen (opened from the slip's QR code).
export async function getTicket(req, res) {
  res.json(await queueService.getTicketStatus(req.params.publicId));
}

// POST /api/tickets/:publicId/urgent: "I need urgent help".
export async function raiseUrgent(req, res) {
  res.json(await queueService.raiseUrgent(req.params.publicId));
}
