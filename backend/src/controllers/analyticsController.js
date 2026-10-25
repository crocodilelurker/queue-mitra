import { findHospitalById } from "../services/hospitalService.js";
import { getHospitalAnalytics } from "../services/analyticsService.js";
import ApiError from "../utils/ApiError.js";

// GET /api/analytics/:hospitalCode? (staff): today's numbers, crowding heatmap and urgent response times.
export async function getAnalytics(req, res) {
  const hospital = await findHospitalById(req.user.hospital);
  if (req.params.hospitalCode && req.params.hospitalCode.toUpperCase() !== hospital.code) {
    throw ApiError.forbidden("You can only see your own hospital's reports");
  }
  res.json(await getHospitalAnalytics(hospital.code));
}
