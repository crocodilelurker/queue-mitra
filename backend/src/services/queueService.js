import Counter from "../models/Counter.js";
import Department from "../models/Department.js";
import Ticket from "../models/Ticket.js";
import User, { DOCTOR_STATES } from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { serviceDate } from "../utils/date.js";
import { emit, rooms } from "../socket/index.js";

// Estimated wait uses the average of the last N consultations in a department.
const CONSULT_SAMPLE_SIZE = 10;
const MIN_CONSULT_MINUTES = 1;

const roundToFive = (minutes) => Math.max(0, Math.round(minutes / 5) * 5);

// ---------- Wait-time estimation ----------

// Minutes this doctor is behind right now: the rest of their break, or how late they're running.
function doctorDelayMinutes(doctor, now = new Date()) {
  const { state, until, delayMinutes } = doctor.status ?? {};
  if (state === "running_late") return delayMinutes || 0;
  if (state === "on_break" && until) return Math.max(0, (new Date(until) - now) / 60000);
  return 0;
}

async function averageConsultMinutes(department) {
  const recent = await Ticket.find({
    department: department._id,
    status: "completed",
    calledAt: { $ne: null },
    completedAt: { $ne: null },
  })
    .sort({ completedAt: -1 })
    .limit(CONSULT_SAMPLE_SIZE)
    .select("calledAt completedAt")
    .lean();

  if (recent.length === 0) return department.avgConsultMinutes;

  const totalMs = recent.reduce((sum, t) => sum + (t.completedAt - t.calledAt), 0);
  return Math.max(MIN_CONSULT_MINUTES, totalMs / recent.length / 60000);
}

// Everything the wait estimate needs for one department, loaded once and reused.
async function loadDepartmentContext(departmentId) {
  const department = await Department.findById(departmentId);
  if (!department) throw ApiError.notFound("Department not found");

  const [avgConsult, doctors] = await Promise.all([
    averageConsultMinutes(department),
    User.find({ role: "doctor", department: department._id }).select("name room status").lean(),
  ]);

  // Waiting patients are shared between the doctors on duty;
  // the doctor who will be free soonest sets the delay.
  const onDuty = doctors.filter((d) => d.status?.state && d.status.state !== "offline");
  const delay = onDuty.length ? Math.min(...onDuty.map((d) => doctorDelayMinutes(d))) : 0;

  return { department, avgConsult, doctors, doctorsOnDuty: Math.max(1, onDuty.length), delay };
}

function estimateWait(peopleAhead, ctx) {
  return roundToFive(Math.ceil(peopleAhead / ctx.doctorsOnDuty) * ctx.avgConsult + ctx.delay);
}

// ---------- Views ----------

function publicDoctor(doctor) {
  const status = doctor.status ?? {};
  return {
    name: doctor.name,
    room: doctor.room,
    state: status.state ?? "offline",
    until: status.state === "on_break" ? status.until : null,
    delayMinutes: status.state === "running_late" ? status.delayMinutes : 0,
  };
}

// What the doctor/staff screens see about a ticket.
function staffTicket(ticket) {
  return {
    id: ticket._id,
    publicId: ticket.publicId,
    tokenNumber: ticket.tokenNumber,
    status: ticket.status,
    patient: ticket.patient,
    language: ticket.language,
    room: ticket.room,
    calledAt: ticket.calledAt,
    completedAt: ticket.completedAt,
    urgent: ticket.urgent,
    createdAt: ticket.createdAt,
  };
}

async function buildSnapshot(ctx) {
  const { department } = ctx;
  const date = serviceDate();

  const [called, waiting] = await Promise.all([
    Ticket.find({ department: department._id, serviceDate: date, status: "called" })
      .sort({ calledAt: -1 })
      .select("tokenNumber room")
      .lean(),
    Ticket.find({ department: department._id, serviceDate: date, status: "waiting" })
      .sort({ sequence: 1 })
      .select("tokenNumber publicId")
      .lean(),
  ]);

  const snapshot = {
    department: {
      id: department._id,
      code: department.code,
      name: department.name,
      floor: department.floor,
      rooms: department.rooms,
    },
    nowServing: called.map((t) => ({ tokenNumber: t.tokenNumber, room: t.room })),
    nextTokens: waiting.slice(0, 3).map((t) => t.tokenNumber),
    waitingCount: waiting.length,
    avgConsultMinutes: Math.round(ctx.avgConsult),
    // Wait for someone who joins the queue right now
    estimatedWaitMinutes: estimateWait(waiting.length, ctx),
    doctors: ctx.doctors.map(publicDoctor),
    updatedAt: new Date().toISOString(),
  };

  return { snapshot, waiting };
}

export async function getQueueSnapshot(departmentId) {
  const ctx = await loadDepartmentContext(departmentId);
  const { snapshot } = await buildSnapshot(ctx);
  return snapshot;
}

// ---------- Real-time broadcast ----------

// Sends the new queue to every screen watching this department, and pushes each
// waiting patient their new position so their screen updates without polling.
async function broadcastQueue(departmentId) {
  try {
    const ctx = await loadDepartmentContext(departmentId);
    const { snapshot, waiting } = await buildSnapshot(ctx);

    emit([rooms.department(departmentId), rooms.staff, rooms.board], "queue:updated", snapshot);

    waiting.forEach((t, peopleAhead) => {
      emit(rooms.ticket(t.publicId), "ticket:position", {
        publicId: t.publicId,
        tokenNumber: t.tokenNumber,
        peopleAhead,
        estimatedWaitMinutes: estimateWait(peopleAhead, ctx),
        nowServing: snapshot.nowServing,
        updatedAt: snapshot.updatedAt,
      });
    });
  } catch (err) {
    // The change itself is already saved; a failed broadcast shouldn't fail the request.
    console.error("Queue broadcast failed:", err);
  }
}

// ---------- Patients ----------

export async function createTicket({ departmentCode, patient, language }) {
  const department = await Department.findOne({
    code: String(departmentCode).toUpperCase(),
    isActive: true,
  });
  if (!department) throw ApiError.notFound("Department not found");

  const date = serviceDate();
  const sequence = await Counter.next(`${department.code}:${date}`);

  const ticket = await Ticket.create({
    tokenNumber: `${department.code}-${String(sequence).padStart(3, "0")}`,
    sequence,
    serviceDate: date,
    department: department._id,
    patient,
    language,
  });

  await broadcastQueue(department._id);
  return getTicketStatus(ticket.publicId);
}

// What the patient sees: token, first name and department only, plus queue position.
export async function getTicketStatus(publicId) {
  const ticket = await Ticket.findOne({ publicId })
    .populate("department", "code name floor")
    .populate("doctor", "name")
    .lean();
  if (!ticket) throw ApiError.notFound("Ticket not found");

  const status = {
    publicId: ticket.publicId,
    tokenNumber: ticket.tokenNumber,
    status: ticket.status,
    firstName: ticket.patient.firstName,
    language: ticket.language,
    department: {
      code: ticket.department.code,
      name: ticket.department.name,
      floor: ticket.department.floor,
    },
    room: ticket.room,
    doctorName: ticket.doctor?.name ?? null,
    peopleAhead: null,
    estimatedWaitMinutes: null,
    nowServing: [],
    urgentRaised: Boolean(ticket.urgent?.raised && !ticket.urgent?.seenAt),
    createdAt: ticket.createdAt,
    calledAt: ticket.calledAt ?? null,
  };

  if (ticket.status === "waiting") {
    const departmentId = ticket.department._id;
    const [ctx, peopleAhead, called] = await Promise.all([
      loadDepartmentContext(departmentId),
      Ticket.countDocuments({
        department: departmentId,
        serviceDate: ticket.serviceDate,
        status: "waiting",
        sequence: { $lt: ticket.sequence },
      }),
      Ticket.find({ department: departmentId, serviceDate: ticket.serviceDate, status: "called" })
        .select("tokenNumber room")
        .lean(),
    ]);

    status.peopleAhead = peopleAhead;
    status.estimatedWaitMinutes = estimateWait(peopleAhead, ctx);
    status.nowServing = called.map((t) => ({ tokenNumber: t.tokenNumber, room: t.room }));
  }

  return status;
}

// ---------- Doctors: the matching engine ----------

export async function getDoctorDashboard(doctor) {
  if (!doctor.department) throw ApiError.badRequest("This doctor is not assigned to a department");

  const [queue, current, waiting] = await Promise.all([
    getQueueSnapshot(doctor.department),
    Ticket.findOne({ doctor: doctor._id, status: "called" }).lean(),
    Ticket.find({ department: doctor.department, serviceDate: serviceDate(), status: "waiting" })
      .sort({ sequence: 1 })
      .limit(20)
      .lean(),
  ]);

  return {
    queue,
    current: current ? staffTicket(current) : null,
    waiting: waiting.map(staffTicket),
  };
}

// Finishes the doctor's current patient (if any) and atomically assigns the next
// waiting ticket in their department to them.
export async function callNext(doctor) {
  if (!doctor.department) throw ApiError.badRequest("This doctor is not assigned to a department");
  const now = new Date();

  const finished = await Ticket.find({ doctor: doctor._id, status: "called" }).select("publicId tokenNumber").lean();
  if (finished.length) {
    await Ticket.updateMany(
      { _id: { $in: finished.map((t) => t._id) } },
      { $set: { status: "completed", completedAt: now } }
    );
  }

  // findOneAndUpdate is atomic, so two doctors pressing "Call next" at the
  // same moment can never be matched to the same patient.
  const next = await Ticket.findOneAndUpdate(
    { department: doctor.department, serviceDate: serviceDate(), status: "waiting" },
    { $set: { status: "called", doctor: doctor._id, room: doctor.room, calledAt: now } },
    { sort: { sequence: 1 }, returnDocument: "after" }
  ).populate("department", "code name floor");

  // Calling a patient means the doctor is working, whatever their status said before.
  if (doctor.status?.state !== "available") {
    await User.updateOne(
      { _id: doctor._id },
      { $set: { status: { state: "available", until: null, delayMinutes: 0 } } }
    );
  }

  for (const t of finished) {
    emit(rooms.ticket(t.publicId), "ticket:updated", { publicId: t.publicId, status: "completed" });
  }

  if (next) {
    const call = {
      publicId: next.publicId,
      tokenNumber: next.tokenNumber,
      room: next.room,
      floor: next.department.floor,
      department: next.department.name,
      doctorName: doctor.name,
      calledAt: next.calledAt,
    };
    emit(rooms.ticket(next.publicId), "ticket:called", call);
    // The board announces this aloud ("Token MED-042, please go to Room 1").
    emit([rooms.board, rooms.department(doctor.department), rooms.staff], "token:called", call);
  }

  await broadcastQueue(doctor.department);

  return {
    completed: finished.map((t) => t.tokenNumber),
    called: next ? staffTicket(next) : null,
  };
}

async function closeTicket(doctor, ticketId, status) {
  const update = { status };
  if (status === "completed") update.completedAt = new Date();

  const ticket = await Ticket.findOneAndUpdate(
    { _id: ticketId, doctor: doctor._id, status: "called" },
    { $set: update },
    { returnDocument: "after" }
  );
  if (!ticket) throw ApiError.notFound("No called ticket with this id for this doctor");

  emit(rooms.ticket(ticket.publicId), "ticket:updated", { publicId: ticket.publicId, status });
  await broadcastQueue(ticket.department);
  return staffTicket(ticket);
}

export const completeTicket = (doctor, ticketId) => closeTicket(doctor, ticketId, "completed");
export const markNoShow = (doctor, ticketId) => closeTicket(doctor, ticketId, "no_show");

export async function updateDoctorStatus(doctor, { state, until, delayMinutes }) {
  if (!DOCTOR_STATES.includes(state)) {
    throw ApiError.badRequest(`state must be one of: ${DOCTOR_STATES.join(", ")}`);
  }

  const status = { state, until: null, delayMinutes: 0 };

  if (state === "on_break") {
    const untilDate = new Date(until);
    if (!until || Number.isNaN(untilDate.getTime())) {
      throw ApiError.badRequest("until (a date/time) is required when on_break");
    }
    status.until = untilDate;
  }

  if (state === "running_late") {
    const minutes = Number(delayMinutes);
    if (!Number.isFinite(minutes) || minutes < 0) {
      throw ApiError.badRequest("delayMinutes (0 or more) is required when running_late");
    }
    status.delayMinutes = minutes;
  }

  const updated = await User.findByIdAndUpdate(doctor._id, { $set: { status } }, { returnDocument: "after" });
  if (updated.department) await broadcastQueue(updated.department);
  return updated;
}

// ---------- Urgent flags ----------
// The app never decides who is urgent. It only raises the flag so qualified staff see it immediately.

export async function raiseUrgent(publicId) {
  const ticket = await Ticket.findOneAndUpdate(
    { publicId },
    { $set: { "urgent.raised": true, "urgent.raisedAt": new Date(), "urgent.seenAt": null, "urgent.seenBy": null } },
    { returnDocument: "after" }
  ).populate("department", "code name floor");
  if (!ticket) throw ApiError.notFound("Ticket not found");

  emit(rooms.staff, "urgent:raised", {
    id: ticket._id,
    tokenNumber: ticket.tokenNumber,
    firstName: ticket.patient.firstName,
    department: ticket.department.name,
    raisedAt: ticket.urgent.raisedAt,
  });

  return { publicId: ticket.publicId, urgentRaised: true, raisedAt: ticket.urgent.raisedAt };
}

export async function listUrgentFlags() {
  const tickets = await Ticket.find({ "urgent.raised": true, "urgent.seenAt": null })
    .sort({ "urgent.raisedAt": 1 })
    .populate("department", "code name floor")
    .lean();

  return tickets.map((t) => ({ ...staffTicket(t), department: t.department }));
}

export async function acknowledgeUrgent(doctor, ticketId) {
  const ticket = await Ticket.findOneAndUpdate(
    { _id: ticketId, "urgent.raised": true, "urgent.seenAt": null },
    { $set: { "urgent.seenAt": new Date(), "urgent.seenBy": doctor._id } },
    { returnDocument: "after" }
  );
  if (!ticket) throw ApiError.notFound("No unseen urgent flag on this ticket");

  emit(rooms.staff, "urgent:seen", { id: ticket._id, seenBy: doctor.name });
  emit(rooms.ticket(ticket.publicId), "ticket:updated", { publicId: ticket.publicId, urgentSeen: true });
  return staffTicket(ticket);
}
