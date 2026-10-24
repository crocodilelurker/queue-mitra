import mongoose from "mongoose";

export const PAYMENT_STATUSES = ["paid", "pending", "waived"];
export const PAYMENT_MODES = ["cash", "upi", "exemption", "card"];

const billSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true, required: true }, // e.g. INV-2026-1001
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital", required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" },
    patientId: { type: String, required: true },
    patientName: { type: String, required: true },
    patientMobile: { type: String, default: "" },

    ticket: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket" },
    tokenNumber: { type: String },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
    departmentCode: { type: String, required: true },

    serviceDate: { type: String, required: true }, // YYYY-MM-DD
    fee: { type: Number, required: true, default: 20 },
    discountOrWaiver: { type: Number, default: 0 },
    netAmount: { type: Number, required: true, default: 20 },

    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "paid" },
    paymentMode: { type: String, enum: PAYMENT_MODES, default: "cash" },
    waiverReason: { type: String, default: "None" }, // e.g. "Ayushman Bharat", "Emergency Casualty", "BPL Card"
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

billSchema.index({ hospital: 1, serviceDate: 1, paymentStatus: 1 });
billSchema.index({ patientId: 1, serviceDate: -1 });

export default mongoose.model("Bill", billSchema);
