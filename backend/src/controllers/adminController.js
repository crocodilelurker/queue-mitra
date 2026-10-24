import { getCentralAdminOverview } from "../services/adminAnalyticsService.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";

export async function handleGetOverview(req, res, next) {
  try {
    const overview = await getCentralAdminOverview("CDH");
    res.json(overview);
  } catch (err) {
    next(err);
  }
}

export async function handleListDoctors(req, res, next) {
  try {
    const doctors = await User.find({ role: "doctor" })
      .populate("department", "code name floor rooms translations")
      .select("name email role room specialty consultationFee status department")
      .lean();
    res.json({ doctors });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateDoctorStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { state, delayMinutes, until, consultationFee } = req.body ?? {};

    const doctor = await User.findById(id);
    if (!doctor || doctor.role !== "doctor") throw ApiError.notFound("Doctor not found");

    if (state) doctor.status.state = state;
    if (delayMinutes !== undefined) doctor.status.delayMinutes = Number(delayMinutes);
    if (until !== undefined) doctor.status.until = until ? new Date(until) : null;
    if (consultationFee !== undefined) doctor.consultationFee = Number(consultationFee);

    await doctor.save();
    res.json({ success: true, doctor });
  } catch (err) {
    next(err);
  }
}
