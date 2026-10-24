import { registerPatient, listPatients, getPatientProfile, updatePatient, deletePatient } from "../services/patientService.js";

export async function handleRegisterPatient(req, res, next) {
  try {
    const patient = await registerPatient(req.body ?? {});
    res.status(201).json({ success: true, patient });
  } catch (err) {
    next(err);
  }
}

export async function handleListPatients(req, res, next) {
  try {
    const { search, page, limit } = req.query;
    const result = await listPatients({ search, page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function handleGetPatientProfile(req, res, next) {
  try {
    const { patientId } = req.params;
    const profile = await getPatientProfile(patientId);
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

export async function handleUpdatePatient(req, res, next) {
  try {
    const { patientId } = req.params;
    const patient = await updatePatient(patientId, req.body ?? {});
    res.json({ success: true, patient });
  } catch (err) {
    next(err);
  }
}

export async function handleDeletePatient(req, res, next) {
  try {
    const { patientId } = req.params;
    const result = await deletePatient(patientId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
