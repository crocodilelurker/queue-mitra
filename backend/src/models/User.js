import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export const ROLES = ["doctor", "user"];
export const DOCTOR_STATES = ["available", "on_break", "running_late", "offline"];

const doctorStatusSchema = new mongoose.Schema(
  {
    state: { type: String, enum: DOCTOR_STATES, default: "offline" },
    // When on_break: the time the doctor is expected back.
    until: { type: Date, default: null },
    // When running_late: how many minutes behind.
    delayMinutes: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ROLES, default: "user" },

    // Doctor-only fields
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    room: { type: String, trim: true },
    status: { type: doctorStatusSchema, default: () => ({}) },

    // Bumped on logout so every previously issued JWT stops working.
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.tokenVersion;
  delete obj.__v;
  return obj;
};

export default mongoose.model("User", userSchema);
