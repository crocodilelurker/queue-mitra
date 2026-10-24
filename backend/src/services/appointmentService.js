import Appointment from "../models/Appointment.js";
import Patient from "../models/Patient.js";
import User from "../models/User.js";
import Department from "../models/Department.js";
import Counter from "../models/Counter.js";
import Bill from "../models/Bill.js";
import Hospital from "../models/Hospital.js";
import ApiError from "../utils/ApiError.js";
import { registerPatient } from "./patientService.js";
import { createTicket } from "./queueService.js";
import { sendSimulatedSms } from "./notificationService.js";

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

async function generateNextAppointmentId() {
  const year = new Date().getFullYear();
  const lastApt = await Appointment.findOne({
    appointmentId: new RegExp(`^APT-${year}-([0-9]+)$`),
  }).sort({ appointmentId: -1 });

  let nextNum = 1001;
  if (lastApt && lastApt.appointmentId) {
    const m = lastApt.appointmentId.match(/-([0-9]+)$/);
    if (m) nextNum = Math.max(nextNum, parseInt(m[1], 10) + 1);
  }

  await Counter.findOneAndUpdate(
    { _id: `appointment:${year}` },
    { $set: { seq: nextNum - 1000 } },
    { upsert: true }
  );

  return `APT-${year}-${String(nextNum)}`;
}

async function generateNextInvoiceNumber() {
  const year = new Date().getFullYear();
  const lastBill = await Bill.findOne({
    invoiceNumber: new RegExp(`^INV-${year}-([0-9]+)$`),
  }).sort({ invoiceNumber: -1 });

  let nextNum = 1001;
  if (lastBill && lastBill.invoiceNumber) {
    const m = lastBill.invoiceNumber.match(/-([0-9]+)$/);
    if (m) nextNum = Math.max(nextNum, parseInt(m[1], 10) + 1);
  }

  await Counter.findOneAndUpdate(
    { _id: `invoice:${year}` },
    { $set: { seq: nextNum - 1000 } },
    { upsert: true }
  );

  return `INV-${year}-${String(nextNum)}`;
}

export async function bookAppointment(data) {
  const {
    patientId: existingPatientId,
    patientData, // if new patient: { firstName, gender, mobile, age, bloodGroup }
    doctorId,
    departmentCode,
    appointmentDate = todayDate(),
    slotTime = "09:30 AM",
    type = "walk_in",
    complaint = "",
    hospitalCode = "CDH",
    isEmergency = false,
    waiverReason = "None",
  } = data;

  const hospital = await Hospital.findOne({ code: hospitalCode });
  if (!hospital) throw ApiError.notFound("Hospital not found");

  // Resolve or create patient
  let patient;
  if (existingPatientId) {
    patient = await Patient.findOne({ patientId: existingPatientId });
    if (!patient) throw ApiError.notFound(`Patient ${existingPatientId} not found`);
  } else if (patientData) {
    patient = await registerPatient({ ...patientData, hospitalCode });
  } else {
    throw ApiError.badRequest("Patient ID or registration details are required");
  }

const DEPT_ALIASES = {
  medicine: "MED",
  med: "MED",
  pediatrics: "CHD",
  chd: "CHD",
  children: "CHD",
  gynecology: "WOM",
  wom: "WOM",
  women: "WOM",
  orthopedics: "ORT",
  ort: "ORT",
  bones: "ORT",
  ent: "ENT",
  ophthalmology: "EYE",
  eye: "EYE",
  eyes: "EYE",
  dermatology: "SKN",
  skn: "SKN",
  skin: "SKN",
};

function normalizeDeptCode(code) {
  if (!code) return "MED";
  const lower = String(code).toLowerCase().trim();
  return DEPT_ALIASES[lower] || String(code).toUpperCase().trim();
}

  // Resolve department & doctor
  const resolvedCode = normalizeDeptCode(departmentCode);
  const department = await Department.findOne({ hospital: hospital._id, code: resolvedCode });
  if (!department) throw ApiError.notFound(`Department ${departmentCode} not found`);

  let doctor;
  if (doctorId) {
    doctor = await User.findById(doctorId);
  } else {
    // Pick first available doctor in department
    doctor = await User.findOne({ department: department._id, role: "doctor" });
  }

  const doctorName = doctor ? doctor.name : "OPD Duty Doctor";
  const appointmentId = await generateNextAppointmentId();

  // If appointment is for today, integrate directly with Queue Mitra's live token ticket!
  let ticket = null;
  let tokenNumber = null;

  if (appointmentDate === todayDate()) {
    try {
      ticket = await createTicket({
        hospitalCode,
        departmentCode: department.code,
        firstName: patient.firstName,
        age: patient.age,
        gender: patient.gender,
        mobile: patient.mobile,
        complaint: complaint || "General consultation",
        isEmergency,
      });
      tokenNumber = ticket.tokenNumber;
    } catch (err) {
      console.warn("[Appointment] Queue token generation skipped:", err.message);
    }
  }

  const appointment = await Appointment.create({
    appointmentId,
    hospital: hospital._id,
    patient: patient._id,
    patientId: patient.patientId,
    patientName: `${patient.firstName} ${patient.lastName || ""}`.trim(),
    patientMobile: patient.mobile,
    patientGender: patient.gender,
    patientAge: patient.age,
    doctor: doctor?._id,
    doctorName,
    department: department._id,
    departmentCode: department.code,
    appointmentDate,
    slotTime,
    type,
    status: appointmentDate === todayDate() ? "in_queue" : "booked",
    complaint,
    ticket: ticket?._id,
    tokenNumber,
  });

  // Automatically generate Subsidized OPD Bill
  const baseFee = isEmergency ? 0 : (doctor?.consultationFee || 20);
  const discountOrWaiver = isEmergency || waiverReason !== "None" ? baseFee : 0;
  const netAmount = Math.max(0, baseFee - discountOrWaiver);
  const invoiceNumber = await generateNextInvoiceNumber();

  const bill = await Bill.create({
    invoiceNumber,
    hospital: hospital._id,
    patient: patient._id,
    patientId: patient.patientId,
    patientName: appointment.patientName,
    patientMobile: patient.mobile,
    ticket: ticket?._id,
    tokenNumber,
    appointment: appointment._id,
    departmentCode: department.code,
    serviceDate: appointmentDate,
    fee: baseFee,
    discountOrWaiver,
    netAmount,
    paymentStatus: netAmount === 0 ? "waived" : "paid",
    paymentMode: netAmount === 0 ? "exemption" : "cash",
    waiverReason: isEmergency ? "Emergency Casualty" : waiverReason,
  });

  return {
    appointment,
    bill,
    ticket,
  };
}

export async function listAppointments({ date, doctorId, departmentCode, status, type, patientId } = {}) {
  const query = {};
  if (date) query.appointmentDate = date;
  if (doctorId) query.doctor = doctorId;
  if (departmentCode) query.departmentCode = departmentCode.toUpperCase();
  if (status) query.status = status;
  if (type) query.type = type;
  if (patientId) query.patientId = patientId;

  return Appointment.find(query).sort({ appointmentDate: -1, slotTime: 1 }).lean();
}

export async function updateAppointment(id, updateData) {
  const appt = await Appointment.findByIdAndUpdate(id, updateData, { new: true });
  if (!appt) throw ApiError.notFound("Appointment not found");
  return appt;
}

export async function recordConsultationCompletion(id, { notes = "", diagnosis = "", followUpDate = null }) {
  const appt = await Appointment.findById(id);
  if (!appt) throw ApiError.notFound("Appointment not found");

  appt.status = "completed";
  appt.consultationNotes = notes;
  appt.diagnosis = diagnosis;
  appt.followUpDate = followUpDate;
  appt.completedAt = new Date();
  await appt.save();

  // If a follow-up date was set, create a follow-up appointment record
  let followUpAppointment = null;
  if (followUpDate) {
    const followUpId = await generateNextAppointmentId();
    followUpAppointment = await Appointment.create({
      appointmentId: followUpId,
      hospital: appt.hospital,
      patient: appt.patient,
      patientId: appt.patientId,
      patientName: appt.patientName,
      patientMobile: appt.patientMobile,
      patientGender: appt.patientGender,
      patientAge: appt.patientAge,
      doctor: appt.doctor,
      doctorName: appt.doctorName,
      department: appt.department,
      departmentCode: appt.departmentCode,
      appointmentDate: followUpDate,
      slotTime: "10:00 AM",
      type: "follow_up",
      status: "booked",
      complaint: `Follow-up for: ${diagnosis || "previous consultation"}`,
    });
  }

  return {
    appointment: appt,
    followUpAppointment,
  };
}
