import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket" },
    publicId: { type: String, required: true },
    tokenNumber: { type: String, required: true },
    // null when the patient gave no mobile number: the message is still shown in the app
    mobile: { type: String, default: null },
    type: {
      type: String,
      enum: ["registered", "near_turn", "called", "doctor_delay", "transferred", "urgent_alert"],
      required: true,
    },
    message: {
      en: { type: String, required: true },
      hi: { type: String },
      ta: { type: String },
      te: { type: String },
    },
    sentAt: { type: Date, default: Date.now },
    status: { type: String, default: "delivered" }, // "delivered" (simulated SMS) or "in_app"
  },
  { timestamps: true }
);

notificationSchema.index({ publicId: 1, sentAt: -1 });
notificationSchema.index({ mobile: 1, sentAt: -1 });

export default mongoose.model("Notification", notificationSchema);
