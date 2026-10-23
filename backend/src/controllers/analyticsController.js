import { getHospitalAnalytics } from "../services/analyticsService.js";

// GET /api/analytics/:hospitalCode: Live staff dashboard metrics & overcrowding heatmap
export async function getAnalytics(req, res) {
  const { hospitalCode = "CDH" } = req.params;
  const data = await getHospitalAnalytics(hospitalCode);
  res.json(data);
}
