import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital", required: true },
    // Short code used as the token prefix, e.g. "MED" -> MED-042 (unique within a hospital)
    code: { type: String, required: true, uppercase: true, trim: true },
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

departmentSchema.index({ hospital: 1, code: 1 }, { unique: true });

export default mongoose.model("Department", departmentSchema);
