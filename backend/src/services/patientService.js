import Patient from "../models/Patient.js";
import Appointment from "../models/Appointment.js";
import Bill from "../models/Bill.js";
import Ticket from "../models/Ticket.js";
import Counter from "../models/Counter.js";
import Hospital from "../models/Hospital.js";
import ApiError from "../utils/ApiError.js";

/**
 * Generate next unique patient ID like CDH-P-1001 safely
 */
async function generateNextPatientId(hospitalCode = "CDH") {
  const lastPatient = await Patient.findOne({
    patientId: new RegExp(`^${hospitalCode}-P-([0-9]+)$`),
  }).sort({ patientId: -1 });

  let nextNum = 1001;
  if (lastPatient && lastPatient.patientId) {
    const m = lastPatient.patientId.match(/-P-([0-9]+)$/);
    if (m) {
      nextNum = Math.max(nextNum, parseInt(m[1], 10) + 1);
    }
  }

  await Counter.findOneAndUpdate(
    { _id: `${hospitalCode}:patient` },
    { $set: { seq: nextNum - 1000 } },
    { upsert: true }
  );

  return `${hospitalCode}-P-${String(nextNum)}`;
}

export async function registerPatient(data) {
  const { firstName, lastName = "", gender, dob, age, mobile, bloodGroup = "Unknown", address = {}, emergencyContact = {}, hospitalCode = "CDH" } = data;

  if (!firstName || !gender || !mobile) {
    throw ApiError.badRequest("First name, gender, and mobile are required");
  }

  const hospital = await Hospital.findOne({ code: hospitalCode });
  if (!hospital) throw ApiError.notFound("Hospital not found");

  // Check if patient already exists with same phone number and first name
  const existing = await Patient.findOne({
    mobile,
    firstName: { $regex: new RegExp(`^${firstName}$`, "i") },
  });

  if (existing) {
    return existing;
  }

  const patientId = await generateNextPatientId(hospitalCode);

  const patient = await Patient.create({
    patientId,
    firstName,
    lastName,
    gender,
    dob,
    age: Number(age) || 30,
    mobile,
    bloodGroup,
    address,
    emergencyContact,
    hospital: hospital._id,
  });

  return patient;
}

export async function listPatients({ search = "", page = 1, limit = 20 } = {}) {
  const query = {};
  if (search && search.trim()) {
    const s = search.trim();
    query.$or = [
      { patientId: { $regex: s, $options: "i" } },
      { firstName: { $regex: s, $options: "i" } },
      { lastName: { $regex: s, $options: "i" } },
      { mobile: { $regex: s, $options: "i" } },
    ];
  }

  const skip = (Math.max(1, page) - 1) * limit;
  const [patients, total] = await Promise.all([
    Patient.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Patient.countDocuments(query),
  ]);

  return {
    patients,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / limit),
  };
}

export async function getPatientProfile(patientId) {
  const patient = await Patient.findOne({ patientId }).lean();
  if (!patient) throw ApiError.notFound(`Patient ${patientId} not found`);

  // Fetch visit history (appointments, tickets, and bills)
  const [appointments, tickets, bills] = await Promise.all([
    Appointment.find({ patientId }).sort({ appointmentDate: -1, createdAt: -1 }).lean(),
    Ticket.find({ "patient.mobile": patient.mobile }).sort({ serviceDate: -1, createdAt: -1 }).limit(10).lean(),
    Bill.find({ patientId }).sort({ serviceDate: -1, createdAt: -1 }).lean(),
  ]);

  return {
    patient,
    visits: appointments,
    queueTickets: tickets,
    billingHistory: bills,
  };
}

export async function updatePatient(patientId, updateData) {
  const patient = await Patient.findOneAndUpdate({ patientId }, updateData, { new: true });
  if (!patient) throw ApiError.notFound(`Patient ${patientId} not found`);
  return patient;
}

export async function deletePatient(patientId) {
  const patient = await Patient.findOneAndDelete({ patientId });
  if (!patient) throw ApiError.notFound(`Patient ${patientId} not found`);
  await Promise.all([
    Appointment.deleteMany({ patientId }),
    Bill.deleteMany({ patientId }),
    Ticket.deleteMany({ "patient.mobile": patient.mobile }),
  ]);
  return { success: true, message: `Patient ${patientId} deleted successfully` };
}
