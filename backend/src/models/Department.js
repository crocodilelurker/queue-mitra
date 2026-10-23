import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    // Short code used as the token prefix, e.g. "MED" -> MED-042
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    // Plain-words description shown on the department picture card
    description: { type: String, trim: true },
    floor: { type: Number, default: 0 },
    rooms: [{ type: String, trim: true }],
    // Starting estimate until real consultation times are available
    avgConsultMinutes: { type: Number, default: 8, min: 1 },
    opdHours: {
      start: { type: String, default: "09:00" },
      end: { type: String, default: "14:00" },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Department", departmentSchema);
