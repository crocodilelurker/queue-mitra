import mongoose from "mongoose";

// "I need urgent help". Raised from a patient's ticket screen, by an emergency registration, or from
// the help button before the patient has any ticket (ticket = null). Staff mark it as seen.
// The app never judges urgency: it only makes sure a person looks at once.
const urgentFlagSchema = new mongoose.Schema(
  {
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital", required: true },
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket", default: null },
    publicId: { type: String, default: null },
    tokenNumber: { type: String, default: null },
    firstName: { type: String, default: null },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    departmentCode: { type: String, default: null },
    departmentName: { type: String, default: null },
    isEmergency: { type: Boolean, default: false },
    complaint: { type: String, trim: true, maxlength: 200 },
    // Where the person is (free text, e.g. "Waiting Hall A, near the lift") and an optional note.
    location: { type: String, trim: true, maxlength: 120 },
    note: { type: String, trim: true, maxlength: 300 },
    language: { type: String, default: "en" },
    // "patient" = pressed the urgent button, "registration" = registered as an emergency
    by: { type: String, enum: ["patient", "registration"], default: "patient" },
    raisedAt: { type: Date, default: Date.now },
    seenAt: { type: Date, default: null },
    seenBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    seenByName: { type: String, default: null },
    responseTimeSeconds: { type: Number, default: null },
  },
  { timestamps: true }
);

urgentFlagSchema.index({ hospital: 1, seenAt: 1, raisedAt: 1 });
urgentFlagSchema.index({ ticket: 1, seenAt: 1 });

export default mongoose.model("UrgentFlag", urgentFlagSchema);
