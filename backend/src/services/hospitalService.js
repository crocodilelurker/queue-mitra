import Department from "../models/Department.js";
import Hospital from "../models/Hospital.js";
import ApiError from "../utils/ApiError.js";

export async function findHospital(code, { withPin = false } = {}) {
  if (!code || typeof code !== "string") throw ApiError.badRequest("hospitalCode is required");
  const query = Hospital.findOne({ code: code.trim().toUpperCase(), isActive: true });
  if (withPin) query.select("+staffPinHash");
  const hospital = await query;
  if (!hospital) throw ApiError.notFound("Hospital not found");
  return hospital;
}

export async function findHospitalById(id) {
  const hospital = id ? await Hospital.findById(id) : null;
  if (!hospital) throw ApiError.notFound("Hospital not found");
  return hospital;
}

// The hospital this deployment serves (single-hospital deployments do not need to send a code).
export async function findHospitalOrDefault(code) {
  if (code) return findHospital(code);
  const hospital = await Hospital.findOne({ isActive: true }).sort({ createdAt: 1 });
  if (!hospital) throw ApiError.notFound("Hospital not set up yet");
  return hospital;
}

// Department codes are only unique within a hospital.
export async function findDepartment(hospital, code) {
  if (!code || typeof code !== "string") throw ApiError.badRequest("departmentCode is required");
  const department = await Department.findOne({
    hospital: hospital._id,
    code: code.trim().toUpperCase(),
    isActive: true,
  });
  if (!department) throw ApiError.notFound("Department not found");
  return department;
}
