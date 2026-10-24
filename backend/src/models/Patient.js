import mongoose from "mongoose";

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];
export const GENDERS = ["male", "female", "other"];

const patientSchema = new mongoose.Schema(
  {
    // Auto-generated unique hospital identifier (e.g. CDH-P-1001)
    patientId: { type: String, unique: true, required: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, default: "", trim: true },
    gender: { type: String, enum: GENDERS, required: true },
    dob: { type: String }, // YYYY-MM-DD
    age: { type: Number, required: true, min: 0, max: 120 },
    mobile: { type: String, required: true, trim: true },
    bloodGroup: { type: String, enum: BLOOD_GROUPS, default: "Unknown" },
    address: {
      line: { type: String, default: "" },
      city: { type: String, default: "Jammu" },
      state: { type: String, default: "Jammu and Kashmir" },
      pincode: { type: String, default: "180001" },
    },
    emergencyContact: {
      name: { type: String, default: "" },
      relation: { type: String, default: "" },
      phone: { type: String, default: "" },
    },
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" },
    registeredBy: { type: String, default: "Reception Desk" },
  },
  { timestamps: true }
);

patientSchema.index({ mobile: 1 });
patientSchema.index({ firstName: "text", lastName: "text", mobile: "text" });

export default mongoose.model("Patient", patientSchema);
