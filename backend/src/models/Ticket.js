import crypto from "node:crypto";
import mongoose from "mongoose";

export const TICKET_STATUSES = ["waiting", "called", "completed", "no_show", "cancelled"];
export const GENDERS = ["male", "female", "other"];

const patientSchema = new mongoose.Schema(
  {
    // Only made-up / minimal data: no Aadhaar, ABHA or address.
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    age: { type: Number, required: true, min: 0, max: 120 },
    gender: { type: String, enum: GENDERS, required: true },
    mobile: { type: String, trim: true, match: /^[6-9]\d{9}$/ },
  },
  { _id: false }
);

const urgentFlagSchema = new mongoose.Schema(
  {
    raised: { type: Boolean, default: false },
    raisedAt: Date,
    seenAt: Date,
    seenBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    responseTimeSeconds: Number,
  },
  { _id: false }
);

const accessibilitySchema = new mongoose.Schema(
  {
    avoidStairs: { type: Boolean, default: false },
    largeText: { type: Boolean, default: false },
    readAloud: { type: Boolean, default: false },
    highContrast: { type: Boolean, default: false },
  },
  { _id: false }
);

const ticketSchema = new mongoose.Schema(
  {
    // Unguessable id used in the patient's QR code / status link
    publicId: { type: String, unique: true, default: () => crypto.randomUUID() },
    tokenNumber: { type: String, required: true }, // e.g. MED-042
    sequence: { type: Number, required: true },
    serviceDate: { type: String, required: true }, // YYYY-MM-DD, local hospital date

    hospital: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital", required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    patient: { type: patientSchema, required: true },
    language: { type: String, default: "en" },

    // Assisted registration ("Someone is helping me")
    isAssisted: { type: Boolean, default: false },
    helperName: { type: String, trim: true },
    accessibility: { type: accessibilitySchema, default: () => ({}) },

    status: { type: String, enum: TICKET_STATUSES, default: "waiting" },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    room: { type: String, default: null },

    calledAt: Date,
    completedAt: Date,

    urgent: { type: urgentFlagSchema, default: () => ({}) },
  },
  { timestamps: true }
);

// The matching engine's main lookup: lowest-numbered waiting ticket in a department today.
ticketSchema.index({ department: 1, serviceDate: 1, status: 1, sequence: 1 });
ticketSchema.index({ department: 1, serviceDate: 1, sequence: 1 }, { unique: true });
// Unseen urgent flags for one hospital's staff dashboard.
ticketSchema.index({ hospital: 1, "urgent.raised": 1, "urgent.seenAt": 1 });

export default mongoose.model("Ticket", ticketSchema);
