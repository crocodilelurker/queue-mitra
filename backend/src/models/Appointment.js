import mongoose from "mongoose";

export const APPOINTMENT_TYPES = ["walk_in", "scheduled", "follow_up"];
export const APPOINTMENT_STATUSES = ["booked", "in_queue", "completed", "cancelled", "no_show"];

const appointmentSchema = new mongoose.Schema(
  {
    appointmentId: { type: String, unique: true, required: true }, // e.g. APT-2026-1001
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital", required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" },
    patientId: { type: String, required: true }, // e.g. CDH-P-1001
    patientName: { type: String, required: true, trim: true },
    patientMobile: { type: String, required: true, trim: true },
    patientGender: { type: String, default: "other" },
    patientAge: { type: Number, default: 30 },

    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    doctorName: { type: String, required: true, trim: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    departmentCode: { type: String, required: true, uppercase: true },

    appointmentDate: { type: String, required: true }, // YYYY-MM-DD
    slotTime: { type: String, default: "09:30 AM" }, // e.g. 10:00 AM
    type: { type: String, enum: APPOINTMENT_TYPES, default: "walk_in" },
    status: { type: String, enum: APPOINTMENT_STATUSES, default: "booked" },

    complaint: { type: String, trim: true },
    // Link to Queue Mitra's live token ticket
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket" },
    tokenNumber: { type: String },

    // Post-consultation records
    consultationNotes: { type: String, default: "" },
    diagnosis: { type: String, default: "" },
    followUpDate: { type: String }, // YYYY-MM-DD
    followUpReminderSent: { type: Boolean, default: false },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

appointmentSchema.index({ hospital: 1, appointmentDate: 1, status: 1 });
appointmentSchema.index({ patientId: 1, appointmentDate: -1 });
appointmentSchema.index({ doctor: 1, appointmentDate: 1 });

export default mongoose.model("Appointment", appointmentSchema);
