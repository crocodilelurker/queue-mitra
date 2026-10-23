import { getNotifications } from "../services/notificationService.js";
import ApiError from "../utils/ApiError.js";

// GET /api/notifications/:identifier: Get simulated SMS history for a publicId or mobile number
export async function getPatientNotifications(req, res) {
  const { identifier } = req.params;
  if (!identifier) throw ApiError.badRequest("Ticket publicId or mobile number is required");

  const notifications = await getNotifications(identifier);
  res.json({ notifications });
}
