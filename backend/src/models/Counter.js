import mongoose from "mongoose";

// Atomic per-department, per-day sequence for token numbers (MED-001, MED-002, ...).
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "MED:2026-10-23"
  seq: { type: Number, default: 0 },
});

counterSchema.statics.next = async function (key) {
  const counter = await this.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return counter.seq;
};

export default mongoose.model("Counter", counterSchema);
