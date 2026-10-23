import mongoose from "mongoose";

export const HOSPITAL_TYPES = ["government", "private"];

const hospitalSchema = new mongoose.Schema(
  {
    // Short code printed in the QR poster at the gate, e.g. "CDH" -> /h/CDH/register
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: HOSPITAL_TYPES, default: "government" },
    address: {
      line: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true, match: /^\d{6}$/ },
    },
    contact: {
      phone: { type: String, trim: true },
      emergencyPhone: { type: String, trim: true },
    },
    floors: { type: Number, default: 1, min: 1 },
    // Prototype staff PIN for quick staff login (e.g. "1234")
    staffPin: { type: String, default: "1234", trim: true },
    // Languages offered on this hospital's screens
    languages: { type: [String], default: ["en", "hi", "ta"] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Hospital", hospitalSchema);
