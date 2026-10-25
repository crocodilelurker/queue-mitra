import * as queueService from "../services/queueService.js";
import ApiError from "../utils/ApiError.js";
import * as v from "../utils/validate.js";

const ticketIdParam = (req) => v.objectId(req.params.ticketId, "ticket id");

export async function getDashboard(req, res) {
  res.json(await queueService.getDoctorDashboard(req.user, { departmentCode: req.query.departmentCode }));
}

// POST /api/doctor/call-next { departmentCode?, room? }
export async function callNext(req, res) {
  const { departmentCode, room } = req.body ?? {};
  res.json(
    await queueService.callNext(req.user, {
      departmentCode: v.text(departmentCode, "departmentCode", { max: 5 }),
      room: v.text(room, "room", { max: 40 }),
    })
  );
}

export async function completeTicket(req, res) {
  res.json(await queueService.completeTicket(req.user, ticketIdParam(req), req.body ?? {}));
}

export async function markNoShow(req, res) {
  res.json(await queueService.markNoShow(req.user, ticketIdParam(req)));
}

export async function requeueTicket(req, res) {
  res.json(await queueService.requeueTicket(req.user, ticketIdParam(req)));
}

export async function transferTicket(req, res) {
  const departmentCode = v.text(req.body?.departmentCode, "departmentCode", { required: true, max: 5 });
  res.json(await queueService.transferTicket(req.user, ticketIdParam(req), departmentCode));
}

// PATCH /api/doctor/status { state, until?, delayMinutes?, doctorId? }
export async function updateStatus(req, res) {
  const { state, until, delayMinutes, doctorId } = req.body ?? {};
  if (doctorId !== undefined && doctorId !== null) v.objectId(doctorId, "doctorId");
  const user = await queueService.updateDoctorStatus(req.user, { state, until, delayMinutes, doctorId });
  res.json({ user, doctor: { _id: user._id, name: user.name, room: user.room, status: user.status } });
}

export async function listUrgent(req, res) {
  res.json({ flags: await queueService.listUrgentFlags(req.user) });
}

// POST /api/doctor/urgent/:id/seen: id = urgent flag id (or the ticket id of a ticket with an open flag)
export async function acknowledgeUrgent(req, res) {
  const id = req.params.ticketId;
  if (!/^[a-f\d]{24}$/i.test(String(id))) throw ApiError.badRequest("Invalid urgent request id");
  res.json(await queueService.acknowledgeUrgent(req.user, id));
}
