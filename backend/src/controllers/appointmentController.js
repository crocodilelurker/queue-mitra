import {
  bookAppointment,
  listAppointments,
  updateAppointment,
  recordConsultationCompletion,
} from "../services/appointmentService.js";

export async function handleBookAppointment(req, res, next) {
  try {
    const result = await bookAppointment(req.body ?? {});
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function handleListAppointments(req, res, next) {
  try {
    const { date, doctorId, departmentCode, status, type, patientId } = req.query;
    const appointments = await listAppointments({ date, doctorId, departmentCode, status, type, patientId });
    res.json({ appointments });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateAppointment(req, res, next) {
  try {
    const { id } = req.params;
    const appointment = await updateAppointment(id, req.body ?? {});
    res.json({ success: true, appointment });
  } catch (err) {
    next(err);
  }
}

export async function handleCompleteConsultation(req, res, next) {
  try {
    const { id } = req.params;
    const result = await recordConsultationCompletion(id, req.body ?? {});
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}
