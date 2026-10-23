import Department from "../models/Department.js";
import { getQueueSnapshot } from "../services/queueService.js";
import ApiError from "../utils/ApiError.js";

export async function listDepartments(req, res) {
  const departments = await Department.find({ isActive: true }).sort({ floor: 1, code: 1 }).lean();
  res.json({ departments });
}

export async function getDepartmentQueue(req, res) {
  const department = await Department.findOne({ code: req.params.code.toUpperCase() }).select("_id");
  if (!department) throw ApiError.notFound("Department not found");

  res.json(await getQueueSnapshot(department._id));
}
