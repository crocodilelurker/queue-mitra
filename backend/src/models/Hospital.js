import mongoose from "mongoose";

export const HOSPITAL_TYPES = ["government", "private"];
export const LANGUAGES = ["en", "hi", "te", "ta"];

const hospitalSchema = new mongoose.Schema(
  {
    // Short code printed on the QR poster at the gate. Chosen (or derived from the name) in /setup.
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 8 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, enum: HOSPITAL_TYPES, default: "government" },
    address: {
      line: { type: String, trim: true, maxlength: 200 },
      city: { type: String, trim: true, maxlength: 80 },
      state: { type: String, trim: true, maxlength: 80 },
      pincode: { type: String, trim: true, match: [/^\d{6}$/, "pincode must be 6 digits"] },
    },
    contact: {
      phone: { type: String, trim: true, maxlength: 20 },
      emergencyPhone: { type: String, trim: true, maxlength: 20 },
    },
    floors: { type: Number, default: 3, min: 1 },
    // bcrypt hash of the counter staff PIN (set in /setup, changed in admin settings). Never sent to clients.
    staffPinHash: { type: String, select: false },
    // Languages offered on this hospital's screens
    languages: { type: [String], default: ["en", "hi", "te", "ta"] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

hospitalSchema.set("toJSON", {
  transform(doc, ret) {
    delete ret.staffPinHash;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Hospital", hospitalSchema);
