import * as queueService from "../services/queueService.js";

export async function getDashboard(req, res) {
  res.json(await queueService.getDoctorDashboard(req.user));
}

export async function callNext(req, res) {
  res.json(await queueService.callNext(req.user));
}

export async function completeTicket(req, res) {
  res.json(await queueService.completeTicket(req.user, req.params.ticketId));
}

export async function markNoShow(req, res) {
  res.json(await queueService.markNoShow(req.user, req.params.ticketId));
}

export async function updateStatus(req, res) {
  const user = await queueService.updateDoctorStatus(req.user, req.body ?? {});
  res.json({ user });
}

export async function listUrgent(req, res) {
  res.json({ flags: await queueService.listUrgentFlags(req.user) });
}

export async function acknowledgeUrgent(req, res) {
  res.json(await queueService.acknowledgeUrgent(req.user, req.params.ticketId));
}
