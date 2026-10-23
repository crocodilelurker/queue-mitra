import Department from "../models/Department.js";
import Hospital from "../models/Hospital.js";
import ApiError from "../utils/ApiError.js";

export async function findHospital(code) {
  const hospital = await Hospital.findOne({ code: String(code).toUpperCase(), isActive: true });
  if (!hospital) throw ApiError.notFound("Hospital not found");
  return hospital;
}

// Department codes are only unique within a hospital.
export async function findDepartment(hospital, code) {
  const department = await Department.findOne({
    hospital: hospital._id,
    code: String(code).toUpperCase(),
    isActive: true,
  });
  if (!department) throw ApiError.notFound("Department not found");
  return department;
}
