import Department from "../models/Department.js";
import Hospital from "../models/Hospital.js";
import { findDepartment, findHospital } from "../services/hospitalService.js";
import { getQueueSnapshot } from "../services/queueService.js";

export async function listHospitals(req, res) {
  const hospitals = await Hospital.find({ isActive: true })
    .select("code name type address.city address.state languages")
    .sort({ name: 1 })
    .lean();
  res.json({ hospitals });
}

// GET /api/hospitals/:code: what the gate QR code opens first.
export async function getHospital(req, res) {
  res.json({ hospital: await findHospital(req.params.code) });
}

export async function listDepartments(req, res) {
  const hospital = await findHospital(req.params.code);
  const departments = await Department.find({ hospital: hospital._id, isActive: true })
    .sort({ floor: 1, code: 1 })
    .lean();
  res.json({ departments });
}

export async function getDepartmentQueue(req, res) {
  const hospital = await findHospital(req.params.code);
  const department = await findDepartment(hospital, req.params.deptCode);
  res.json(await getQueueSnapshot(department._id));
}
