import env from "../config/env.js";
import { resolveRoom } from "../data/departmentCatalog.js";
import Counter from "../models/Counter.js";
import Department from "../models/Department.js";
import Hospital from "../models/Hospital.js";
import Notification from "../models/Notification.js";
import Ticket from "../models/Ticket.js";
import UrgentFlag from "../models/UrgentFlag.js";
import User, { DOCTOR_STATES } from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { serviceDate } from "../utils/date.js";
import { emit, notifyHospital, rooms } from "../socket/index.js";
import { findDepartment, findHospital } from "./hospitalService.js";
import { sendSimulatedSms } from "./notificationService.js";

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

export async function averageConsultMinutes(department) {
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
export async function loadDepartmentContext(departmentId) {
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

export function estimateWait(peopleAhead, ctx) {
  return roundToFive(Math.ceil(peopleAhead / ctx.doctorsOnDuty) * ctx.avgConsult + ctx.delay);
}

// Waiting-area crowding: green below 70% of the seats, amber 70-100%, red above 100%.
export function crowdLevel(waitingCount, seatingCapacity) {
  const capacity = seatingCapacity || 15;
  const ratio = waitingCount / capacity;
  if (ratio > 1) return { status: "red", label: "Overcrowded", ratio, capacity };
  if (ratio >= 0.7) return { status: "amber", label: "Busy", ratio, capacity };
  return { status: "green", label: "Normal", ratio, capacity };
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
export function staffTicket(ticket) {
  return {
    id: ticket._id,
    _id: ticket._id,
    ticketId: ticket._id,
    publicId: ticket.publicId,
    tokenNumber: ticket.tokenNumber,
    status: ticket.status,
    patient: ticket.patient,
    language: ticket.language,
    isEmergency: Boolean(ticket.isEmergency),
    complaint: ticket.complaint ?? null,
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

  const crowd = crowdLevel(waiting.length, department.seatingCapacity);
  const { capacity, ratio } = crowd;
  const overcrowdingColor = crowd.status;
  const overcrowdingLabel = crowd.label;

  const snapshot = {
    hospital: department.hospital,
    department: {
      id: department._id,
      code: department.code,
      name: department.name,
      description: department.description,
      floor: department.floor,
      rooms: department.rooms,
      seatingCapacity: capacity,
      translations: department.translations,
      icon: department.icon,
    },
    overcrowding: {
      status: overcrowdingColor,
      label: overcrowdingLabel,
      waitingCount: waiting.length,
      capacity,
      ratio: Number(ratio.toFixed(2)),
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
export async function broadcastQueue(departmentId, reason = "queue") {
  try {
    const ctx = await loadDepartmentContext(departmentId);
    const { snapshot, waiting } = await buildSnapshot(ctx);
    const hospitalId = ctx.department.hospital;

    emit(
      [rooms.department(departmentId), rooms.staff(hospitalId), rooms.board(hospitalId)],
      "queue:updated",
      snapshot
    );
    notifyHospital(hospitalId, reason, { departmentId: String(departmentId) });

    waiting.forEach(async (t, peopleAhead) => {
      const waitMin = estimateWait(peopleAhead, ctx);
      emit(rooms.ticket(t.publicId), "ticket:position", {
        publicId: t.publicId,
        tokenNumber: t.tokenNumber,
        peopleAhead,
        estimatedWaitMinutes: waitMin,
        nowServing: snapshot.nowServing,
        updatedAt: snapshot.updatedAt,
      });

      // When 3 people are ahead: trigger simulated SMS alert (once per ticket)
      if (peopleAhead === 3) {
        try {
          if (await Notification.exists({ publicId: t.publicId, type: "near_turn" })) return;
          const fullTicket = await Ticket.findOne({ publicId: t.publicId }).populate("department");
          if (fullTicket) {
            await sendSimulatedSms({
              ticket: fullTicket,
              type: "near_turn",
              metadata: {
                deptName: ctx.department.name,
                room: ctx.department.rooms[0] || "Room",
                floor: ctx.department.floor,
              },
            });
          }
        } catch {
          // non-critical
        }
      }
    });
  } catch (err) {
    // The change itself is already saved; a failed broadcast shouldn't fail the request.
    console.error("Queue broadcast failed:", err);
  }
}

// ---------- Patients ----------

export async function createTicket({
  hospitalCode,
  hospital: hospitalDoc,
  departmentCode,
  patient,
  language,
  isAssisted = false,
  helperName,
  accessibility = {},
  isEmergency = false,
  complaint,
}) {
  const hospital = hospitalDoc ?? (await findHospital(hospitalCode));
  const department = await findDepartment(hospital, departmentCode);

  const date = serviceDate();
  // The token number always comes from the counter (MED-021); the queue order is `sequence`.
  const counterSeq = await Counter.next(`${hospital.code}:${department.code}:${date}`);

  let ticket;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    // Emergency tickets take a place in front of everyone still waiting.
    const sequence = isEmergency ? await frontOfQueueSequence(department._id, date, counterSeq) : counterSeq;
    try {
      ticket = await Ticket.create({
        tokenNumber: `${department.code}-${String(counterSeq).padStart(3, "0")}`,
        sequence,
        serviceDate: date,
        hospital: hospital._id,
        department: department._id,
        patient,
        language: language || "en",
        isAssisted: Boolean(isAssisted),
        helperName: helperName || undefined,
        isEmergency: Boolean(isEmergency),
        complaint: complaint || undefined,
        accessibility: {
          avoidStairs: Boolean(accessibility?.avoidStairs),
          largeText: Boolean(accessibility?.largeText),
          readAloud: Boolean(accessibility?.readAloud),
          highContrast: Boolean(accessibility?.highContrast),
        },
      });
      break;
    } catch (err) {
      // Two emergencies at the same instant can pick the same place: pick again.
      if (!(err.code === 11000 && isEmergency && attempt < 3)) throw err;
    }
  }

  // An emergency ticket also alerts staff immediately (siren on the doctor and staff screens).
  if (isEmergency) await raiseUrgent(ticket.publicId, { by: "registration" });

  const status = await getTicketStatus(ticket.publicId);

  // Dispatch initial welcome SMS alert
  sendSimulatedSms({
    ticket,
    type: "registered",
    metadata: {
      deptName: department.name,
      room: department.rooms[0] || "OPD",
      floor: department.floor,
      estimatedWaitMinutes: status.estimatedWaitMinutes,
    },
  }).catch(() => {});

  await broadcastQueue(department._id, "ticket:registered");
  return status;
}

// A queue position in front of every waiting NORMAL ticket but behind earlier emergencies, so emergency
// tickets are served first-come-first-served among themselves. Positions can be fractions, so this
// never collides with a position that is already taken (including served tickets).
async function frontOfQueueSequence(departmentId, date, fallback) {
  const firstNormal = await Ticket.findOne({ department: departmentId, serviceDate: date, status: "waiting", isEmergency: { $ne: true } })
    .sort({ sequence: 1 })
    .select("sequence")
    .lean();
  if (!firstNormal) return fallback; // nobody normal is waiting: the next counter position is already behind any earlier emergency
  const before = await Ticket.findOne({ department: departmentId, serviceDate: date, sequence: { $lt: firstNormal.sequence } })
    .sort({ sequence: -1 })
    .select("sequence")
    .lean();
  return before ? (before.sequence + firstNormal.sequence) / 2 : firstNormal.sequence - 1;
}

// What the patient sees: token, first name and department only, plus queue position.
export async function getTicketStatus(publicId) {
  const ticket = await Ticket.findOne({ publicId: String(publicId) })
    .populate("hospital", "code name")
    .populate("department", "code name floor rooms")
    .populate("doctor", "name")
    .lean();
  if (!ticket || !ticket.hospital || !ticket.department) throw ApiError.notFound("Ticket not found");

  const status = {
    publicId: ticket.publicId,
    tokenNumber: ticket.tokenNumber,
    status: ticket.status,
    firstName: ticket.patient.firstName,
    language: ticket.language,
    isEmergency: Boolean(ticket.isEmergency),
    hospital: { code: ticket.hospital.code, name: ticket.hospital.name },
    department: {
      code: ticket.department.code,
      name: ticket.department.name,
      floor: ticket.department.floor,
      rooms: ticket.department.rooms,
    },
    room: ticket.room,
    doctorName: ticket.doctor?.name ?? null,
    peopleAhead: null,
    estimatedWaitMinutes: null,
    nowServing: [],
    urgentRaised: Boolean(ticket.urgent?.raised && !ticket.urgent?.seenAt),
    accessibility: ticket.accessibility ?? {},
    serviceDate: ticket.serviceDate,
    createdAt: ticket.createdAt,
    calledAt: ticket.calledAt ?? null,
    completedAt: ticket.completedAt ?? null,
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

// ---------- Doctors and staff: the matching engine ----------

const isDoctor = (actor) => actor?.role === "doctor";

// Which department a console user is looking at: a doctor's own, or ?departmentCode= for staff/admin.
async function consoleDepartment(actor, departmentCode) {
  if (departmentCode) {
    const department = await Department.findOne({
      hospital: actor.hospital,
      code: String(departmentCode).trim().toUpperCase(),
      isActive: true,
    });
    if (!department) throw ApiError.notFound("Department not found");
    return department;
  }
  if (actor.department) {
    const department = await Department.findById(actor.department);
    if (department) return department;
  }
  throw ApiError.badRequest(
    isDoctor(actor) ? "This doctor is not assigned to a department" : "departmentCode is required"
  );
}

export async function getDoctorDashboard(actor, { departmentCode } = {}) {
  const department = await consoleDepartment(actor, departmentCode);
  const date = serviceDate();
  const currentQuery = isDoctor(actor)
    ? { doctor: actor._id, status: "called" }
    : { department: department._id, serviceDate: date, status: "called" };

  const [queue, current, waiting] = await Promise.all([
    getQueueSnapshot(department._id),
    Ticket.findOne(currentQuery).sort({ calledAt: -1 }).lean(),
    Ticket.find({ department: department._id, serviceDate: date, status: "waiting" })
      .sort({ sequence: 1 })
      .limit(50)
      .lean(),
  ]);

  return {
    queue,
    current: current ? staffTicket(current) : null,
    waiting: waiting.map(staffTicket),
  };
}

// Works out the department, room and doctor for a "Call next" press.
// Doctors default to their own department and room; staff/admin pick a department (and optionally a room).
async function resolveCallTarget(actor, { departmentCode, room } = {}) {
  let department = null;
  const canonicalRoom = room ? resolveRoom(room)?.name ?? String(room).trim() : null;

  if (departmentCode) {
    department = await consoleDepartment(actor, departmentCode);
  } else if (isDoctor(actor) && actor.department) {
    department = await Department.findById(actor.department);
  } else if (canonicalRoom) {
    department = await Department.findOne({ hospital: actor.hospital, rooms: canonicalRoom, isActive: true });
  }
  if (!department) {
    throw ApiError.badRequest(isDoctor(actor) ? "This doctor is not assigned to a department" : "departmentCode is required");
  }
  if (String(department.hospital) !== String(actor.hospital)) throw ApiError.notFound("Department not found");

  const ownDepartment = isDoctor(actor) && String(actor.department) === String(department._id);
  const callRoom = canonicalRoom || (ownDepartment && actor.room) || department.rooms[0] || null;
  if (canonicalRoom && department.rooms.length && !department.rooms.includes(canonicalRoom)) {
    throw ApiError.badRequest(`room must be one of: ${department.rooms.join(", ")}`);
  }

  let doctor = null;
  if (isDoctor(actor)) {
    doctor = actor;
  } else if (callRoom) {
    const inRoom = await User.find({ role: "doctor", hospital: actor.hospital, department: department._id, room: callRoom });
    doctor = inRoom.find((d) => d.status?.state && d.status.state !== "offline") ?? inRoom[0] ?? null;
  }

  return { department, room: callRoom, doctor };
}

// Finishes the room's current patient (if any) and atomically assigns the next waiting ticket in the
// department to that room. Returns 404 "Queue is empty" when nobody is waiting.
export async function callNext(actor, options = {}) {
  const { department, room, doctor } = await resolveCallTarget(actor, options);
  const hospitalId = department.hospital;
  const now = new Date();
  const date = serviceDate();

  const currentFilters = [];
  if (room) currentFilters.push({ department: department._id, room, status: "called" });
  if (doctor) currentFilters.push({ doctor: doctor._id, status: "called" });
  const finished = currentFilters.length
    ? await Ticket.find({ $or: currentFilters }).select("publicId tokenNumber").lean()
    : [];
  if (finished.length) {
    await Ticket.updateMany(
      { _id: { $in: finished.map((t) => t._id) }, status: "called" },
      { $set: { status: "completed", completedAt: now } }
    );
  }

  // findOneAndUpdate is atomic, so two rooms pressing "Call next" at the
  // same moment can never be matched to the same patient.
  const next = await Ticket.findOneAndUpdate(
    { department: department._id, serviceDate: date, status: "waiting" },
    { $set: { status: "called", doctor: doctor?._id ?? null, room, calledAt: now } },
    { sort: { sequence: 1 }, returnDocument: "after" }
  ).populate("department", "code name floor");

  // A doctor calling a patient is working, whatever their status said before.
  if (isDoctor(actor) && actor.status?.state !== "available") {
    await User.updateOne({ _id: actor._id }, { $set: { status: { state: "available", until: null, delayMinutes: 0 } } });
  }

  for (const t of finished) {
    emit(rooms.ticket(t.publicId), "ticket:updated", { publicId: t.publicId, status: "completed" });
  }

  if (next) {
    const call = {
      ticketId: next._id,
      publicId: next.publicId,
      tokenNumber: next.tokenNumber,
      firstName: next.patient?.firstName,
      room: next.room,
      floor: next.department.floor,
      department: next.department.name,
      departmentCode: next.department.code,
      departmentName: next.department.name,
      doctorName: doctor?.name ?? null,
      calledAt: next.calledAt,
    };
    emit(rooms.ticket(next.publicId), "ticket:called", call);
    // The board announces this aloud ("Token MED-042, please go to Room 1").
    emit([rooms.board(hospitalId), rooms.department(department._id), rooms.staff(hospitalId)], "token:called", call);

    sendSimulatedSms({
      ticket: next,
      type: "called",
      metadata: {
        room: next.room,
        floor: next.department.floor,
        doctorName: doctor?.name ?? "The doctor",
        deptName: next.department.name,
      },
    }).catch(() => {});
  }

  await broadcastQueue(department._id, next ? "ticket:called" : "ticket:completed");

  if (!next) throw ApiError.notFound("Queue is empty");

  const ticket = staffTicket(next);
  return { ticket, called: ticket, completed: finished.map((t) => t.tokenNumber) };
}

// Which tickets a console user may act on: doctors their own patients or their department's,
// staff and admins anything in their hospital.
function actorTicketScope(actor) {
  if (isDoctor(actor)) {
    const or = [{ doctor: actor._id }];
    if (actor.department) or.push({ department: actor.department });
    return { hospital: actor.hospital, $or: or };
  }
  return { hospital: actor.hospital };
}

const CLINICAL_FIELDS = ["diagnosis", "consultationNotes", "prescriptions", "followUpDate"];

async function closeTicket(actor, ticketId, status, clinicalData = {}) {
  const update = { status };
  if (status === "completed") {
    update.completedAt = new Date();
    for (const field of CLINICAL_FIELDS) {
      const value = clinicalData?.[field];
      if (typeof value === "string" && value.trim()) update[field] = value.trim().slice(0, 2000);
    }
  }
  // A patient can be marked absent while waiting or after being called; only a called patient can be completed.
  const fromStatuses = status === "no_show" ? ["called", "waiting"] : ["called"];

  const ticket = await Ticket.findOneAndUpdate(
    { _id: ticketId, status: { $in: fromStatuses }, ...actorTicketScope(actor) },
    { $set: update },
    { returnDocument: "after" }
  );
  if (!ticket) {
    throw ApiError.notFound(status === "completed" ? "No called patient with this ticket" : "No active patient with this ticket");
  }

  emit(rooms.ticket(ticket.publicId), "ticket:updated", { publicId: ticket.publicId, status });
  await broadcastQueue(ticket.department, status === "completed" ? "ticket:completed" : "ticket:no_show");
  return staffTicket(ticket);
}

export const completeTicket = (actor, ticketId, clinicalData) => closeTicket(actor, ticketId, "completed", clinicalData);
export const markNoShow = (actor, ticketId) => closeTicket(actor, ticketId, "no_show");

// Send a patient to the end of the queue (e.g. they stepped out or arrived late)
export async function requeueTicket(actor, ticketId) {
  const ticket = await Ticket.findOne({
    _id: ticketId,
    status: { $in: ["called", "waiting", "no_show"] },
    ...actorTicketScope(actor),
  });
  if (!ticket) throw ApiError.notFound("Active ticket not found");

  const hospital = await Hospital.findById(ticket.hospital);
  const department = await Department.findById(ticket.department);
  const date = ticket.serviceDate || serviceDate();

  // Place at the tail of the line without using up a token number: halfway between the last position
  // in the queue and the next token the counter will issue (so it never collides with either).
  const [last, counter] = await Promise.all([
    Ticket.findOne({ department: department._id, serviceDate: date }).sort({ sequence: -1 }).select("sequence").lean(),
    Counter.findById(`${hospital.code}:${department.code}:${date}`).lean(),
  ]);
  const nextToken = Math.max(counter?.seq ?? 0, Math.floor(last?.sequence ?? 0)) + 1;
  const newSequence = last && String(last._id) === String(ticket._id) ? ticket.sequence : ((last?.sequence ?? 0) + nextToken) / 2;

  ticket.status = "waiting";
  ticket.sequence = newSequence;
  ticket.doctor = null;
  ticket.room = null;
  ticket.calledAt = null;
  await ticket.save();

  emit(rooms.ticket(ticket.publicId), "ticket:updated", {
    publicId: ticket.publicId,
    status: "waiting",
    message: "Moved to the end of the queue",
  });

  await broadcastQueue(department._id, "ticket:requeued");
  return staffTicket(ticket);
}

// Move a patient to another department
export async function transferTicket(actor, ticketId, targetDepartmentCode) {
  const ticket = await Ticket.findOne({ _id: ticketId, status: { $in: ["called", "waiting"] }, ...actorTicketScope(actor) });
  if (!ticket) throw ApiError.notFound("Active ticket not found");

  const hospital = await Hospital.findById(ticket.hospital);
  const newDept = await findDepartment(hospital, targetDepartmentCode);
  const oldDeptId = ticket.department;

  if (oldDeptId.toString() === newDept._id.toString()) {
    throw ApiError.badRequest("Ticket is already in this department");
  }

  const date = serviceDate();
  const sequence = await Counter.next(`${hospital.code}:${newDept.code}:${date}`);
  const newTokenNumber = `${newDept.code}-${String(sequence).padStart(3, "0")}`;

  ticket.department = newDept._id;
  ticket.tokenNumber = newTokenNumber;
  ticket.sequence = sequence;
  ticket.serviceDate = date;
  ticket.status = "waiting";
  ticket.doctor = null;
  ticket.room = null;
  ticket.calledAt = null;
  ticket.completedAt = null;
  await ticket.save();

  const populated = await ticket.populate("department", "code name floor rooms");

  sendSimulatedSms({
    ticket: populated,
    type: "transferred",
    metadata: {
      deptName: newDept.name,
      room: newDept.rooms[0] || "OPD",
      floor: newDept.floor,
    },
  }).catch(() => {});

  emit(rooms.ticket(ticket.publicId), "ticket:transferred", {
    publicId: ticket.publicId,
    newTokenNumber,
    newDepartment: {
      code: newDept.code,
      name: newDept.name,
      floor: newDept.floor,
    },
  });

  // Open urgent flags follow the patient.
  await UrgentFlag.updateMany(
    { ticket: ticket._id, seenAt: null },
    { $set: { tokenNumber: newTokenNumber, department: newDept._id, departmentCode: newDept.code, departmentName: newDept.name } }
  );

  await Promise.all([broadcastQueue(oldDeptId, "ticket:transferred"), broadcastQueue(newDept._id, "ticket:transferred")]);

  return staffTicket(populated);
}

// Doctors set their own status; staff and admins pass doctorId to set any doctor's status.
export async function updateDoctorStatus(actor, { state, until, delayMinutes, doctorId } = {}) {
  if (!DOCTOR_STATES.includes(state)) {
    throw ApiError.badRequest(`state must be one of: ${DOCTOR_STATES.join(", ")}`);
  }

  let target;
  if (isDoctor(actor) && (!doctorId || String(doctorId) === String(actor._id))) {
    target = actor;
  } else if (isDoctor(actor)) {
    throw ApiError.forbidden("Doctors can only change their own status");
  } else {
    if (!doctorId) throw ApiError.badRequest("doctorId is required");
    target = await User.findOne({ _id: doctorId, role: "doctor", hospital: actor.hospital });
    if (!target) throw ApiError.notFound("Doctor not found");
  }

  const status = { state, until: null, delayMinutes: 0 };

  if (state === "on_break") {
    const untilDate = until ? new Date(until) : new Date(Date.now() + 15 * 60000);
    if (Number.isNaN(untilDate.getTime())) throw ApiError.badRequest("until must be a date/time");
    status.until = untilDate;
  }

  if (state === "running_late") {
    const minutes = delayMinutes === undefined || delayMinutes === null || delayMinutes === "" ? 10 : Number(delayMinutes);
    if (!Number.isFinite(minutes) || minutes < 0 || minutes > 480) {
      throw ApiError.badRequest("delayMinutes must be between 0 and 480");
    }
    status.delayMinutes = Math.round(minutes);
  }

  const updated = await User.findByIdAndUpdate(target._id, { $set: { status } }, { returnDocument: "after" });

  const payload = { doctorId: updated._id, name: updated.name, room: updated.room, departmentId: updated.department, status: updated.status };
  const targets = [rooms.staff(updated.hospital), rooms.board(updated.hospital)];
  if (updated.department) targets.push(rooms.department(updated.department));
  emit(targets, "doctor:status", payload);

  if (updated.department) {
    await broadcastQueue(updated.department, "doctor:status");

    if (state === "running_late") {
      Ticket.find({ department: updated.department, serviceDate: serviceDate(), status: "waiting" })
        .populate("department")
        .then((waitingList) => {
          waitingList.forEach((t) => {
            sendSimulatedSms({
              ticket: t,
              type: "doctor_delay",
              metadata: { room: updated.room || "the OPD room", delayMinutes: status.delayMinutes },
            }).catch(() => {});
          });
        })
        .catch(() => {});
    }
  } else {
    notifyHospital(updated.hospital, "doctor:status");
  }

  return updated;
}

// ---------- Urgent flags & Emergency SLA ----------
// The app never decides who is urgent. It only raises the flag so qualified staff see it immediately.

export function serializeFlag(flag) {
  return {
    id: flag._id,
    _id: flag._id,
    flagId: flag._id,
    ticketId: flag.ticket ?? null,
    publicId: flag.publicId ?? null,
    tokenNumber: flag.tokenNumber ?? null,
    firstName: flag.firstName ?? null,
    departmentCode: flag.departmentCode ?? null,
    departmentName: flag.departmentName ?? null,
    department: flag.departmentCode ? { code: flag.departmentCode, name: flag.departmentName } : null,
    isEmergency: Boolean(flag.isEmergency),
    complaint: flag.complaint ?? null,
    location: flag.location ?? null,
    note: flag.note ?? null,
    language: flag.language ?? "en",
    by: flag.by,
    raisedAt: flag.raisedAt,
    seenAt: flag.seenAt ?? null,
    seenBy: flag.seenByName ?? null,
    responseTimeSeconds: flag.responseTimeSeconds ?? null,
  };
}

function announceFlag(flag) {
  const payload = serializeFlag(flag);
  // Older screens read `department` as a name.
  emit(rooms.staff(flag.hospital), "urgent:raised", { ...payload, department: flag.departmentName });
  notifyHospital(flag.hospital, "urgent:raised");
  return payload;
}

// "I need urgent help" from a patient's ticket (or an emergency registration).
export async function raiseUrgent(publicId, { by = "patient" } = {}) {
  const ticket = await Ticket.findOne({ publicId: String(publicId) }).populate("department", "code name floor");
  if (!ticket) throw ApiError.notFound("Ticket not found");

  // Pressing the button again while staff haven't seen it yet re-alerts them instead of adding a duplicate.
  let flag = await UrgentFlag.findOne({ ticket: ticket._id, seenAt: null });
  if (!flag) {
    flag = await UrgentFlag.create({
      hospital: ticket.hospital,
      ticket: ticket._id,
      publicId: ticket.publicId,
      tokenNumber: ticket.tokenNumber,
      firstName: ticket.patient.firstName,
      department: ticket.department?._id ?? null,
      departmentCode: ticket.department?.code ?? null,
      departmentName: ticket.department?.name ?? null,
      isEmergency: Boolean(ticket.isEmergency),
      complaint: ticket.complaint,
      language: ticket.language,
      by,
    });
    ticket.urgent = { raised: true, raisedAt: flag.raisedAt, seenAt: null, seenBy: null };
    await ticket.save();
  }

  const payload = announceFlag(flag);
  emit(rooms.ticket(ticket.publicId), "ticket:updated", { publicId: ticket.publicId, urgentRaised: true });
  return { publicId: ticket.publicId, urgentRaised: true, raisedAt: flag.raisedAt, flag: payload };
}

// "I need urgent help" before the person has a ticket.
export async function raiseUrgentWithoutTicket(hospital, { location, note, language } = {}) {
  const flag = await UrgentFlag.create({ hospital: hospital._id, location, note, language: language || "en", by: "patient" });
  return { flag: announceFlag(flag) };
}

export async function listUrgentFlags(actor) {
  const flags = await UrgentFlag.find({ hospital: actor.hospital, seenAt: null }).sort({ raisedAt: 1 }).lean();
  return flags.map(serializeFlag);
}

// Accepts an urgent flag id, or (for older screens) the ticket id of a ticket with an open flag.
export async function acknowledgeUrgent(actor, id) {
  let flag = mongooseId(id) ? await UrgentFlag.findOne({ _id: id, hospital: actor.hospital }) : null;
  if (!flag && mongooseId(id)) {
    flag = await UrgentFlag.findOne({ ticket: id, hospital: actor.hospital }).sort({ seenAt: 1, raisedAt: -1 });
  }
  if (!flag) throw ApiError.notFound("Urgent request not found");
  if (flag.seenAt) return { ...serializeFlag(flag), alreadySeen: true };

  const now = new Date();
  const responseTimeSeconds = Math.max(1, Math.round((now - flag.raisedAt) / 1000));
  const updated = await UrgentFlag.findOneAndUpdate(
    { _id: flag._id, seenAt: null },
    { $set: { seenAt: now, seenBy: actor._id, seenByName: actor.name, responseTimeSeconds } },
    { returnDocument: "after" }
  );
  if (!updated) return { ...serializeFlag(await UrgentFlag.findById(flag._id)), alreadySeen: true };

  if (updated.ticket) {
    const ticket = await Ticket.findByIdAndUpdate(
      updated.ticket,
      { $set: { "urgent.seenAt": now, "urgent.seenBy": actor._id, "urgent.responseTimeSeconds": responseTimeSeconds } },
      { returnDocument: "after" }
    );
    if (ticket) emit(rooms.ticket(ticket.publicId), "ticket:updated", { publicId: ticket.publicId, urgentSeen: true });
  }

  emit(rooms.staff(actor.hospital), "urgent:seen", {
    id: updated._id,
    flagId: updated._id,
    ticketId: updated.ticket,
    seenBy: actor.name,
    responseTimeSeconds,
  });
  notifyHospital(actor.hospital, "urgent:seen");
  return serializeFlag(updated);
}

const mongooseId = (id) => /^[a-f\d]{24}$/i.test(String(id));

// "I have my slip": Look up a ticket by its printed token number (e.g. MED-001)
export async function getTicketByTokenNumber(hospitalCode, tokenNumber) {
  const hospital = await findHospital(hospitalCode);
  const date = serviceDate();
  // "med 7", "MED7" and "MED-007" all mean MED-007.
  let token = String(tokenNumber ?? "").toUpperCase().replace(/\s+/g, "");
  const m = token.match(/^([A-Z]{2,5})-?(\d{1,4})$/);
  if (m) token = `${m[1]}-${m[2].padStart(3, "0")}`;
  const ticket = await Ticket.findOne({ hospital: hospital._id, serviceDate: date, tokenNumber: token })
    .sort({ createdAt: -1 })
    .select("publicId");
  if (!ticket) throw ApiError.notFound(`No active ticket found today with token ${tokenNumber}`);
  return getTicketStatus(ticket.publicId);
}

// Update patient accessibility & language preferences
const ACCESSIBILITY_KEYS = ["avoidStairs", "largeText", "readAloud", "highContrast"];

export async function updateTicketPreferences(publicId, { accessibility = {}, language } = {}) {
  const update = {};
  if (typeof language === "string" && /^[a-z]{2,3}$/.test(language)) update.language = language;
  for (const key of ACCESSIBILITY_KEYS) {
    if (accessibility && key in accessibility) update[`accessibility.${key}`] = Boolean(accessibility[key]);
  }

  const ticket = await Ticket.findOneAndUpdate(
    { publicId: String(publicId) },
    { $set: update },
    { returnDocument: "after" }
  ).populate("hospital department doctor");
  if (!ticket) throw ApiError.notFound("Ticket not found");

  return getTicketStatus(ticket.publicId);
}

// Full OPD Slip payload for printing, image saving, and offline caching
export async function getTicketSlip(publicId) {
  const ticket = await Ticket.findOne({ publicId: String(publicId) })
    .populate("hospital", "code name address contact")
    .populate("department", "code name floor rooms description")
    .populate("doctor", "name")
    .lean();
  if (!ticket || !ticket.hospital || !ticket.department) throw ApiError.notFound("Ticket not found");

  const status = await getTicketStatus(publicId);

  return {
    publicId: ticket.publicId,
    tokenNumber: ticket.tokenNumber,
    serviceDate: ticket.serviceDate,
    createdAt: ticket.createdAt,
    hospital: {
      code: ticket.hospital.code,
      name: ticket.hospital.name,
      address: ticket.hospital.address,
      contact: ticket.hospital.contact,
    },
    department: {
      code: ticket.department.code,
      name: ticket.department.name,
      floor: ticket.department.floor,
      description: ticket.department.description,
    },
    room: ticket.room || ticket.department.rooms[0] || null,
    doctorName: ticket.doctor?.name ?? null,
    patient: {
      firstName: ticket.patient.firstName,
      age: ticket.patient.age,
      gender: ticket.patient.gender,
      mobile: ticket.patient.mobile ? `${ticket.patient.mobile.slice(0, 4)}XXXXXX` : null,
    },
    isAssisted: Boolean(ticket.isAssisted),
    helperName: ticket.helperName || null,
    isEmergency: Boolean(ticket.isEmergency),
    complaint: ticket.complaint || null,
    accessibility: ticket.accessibility || {},
    language: ticket.language || "en",
    status: ticket.status,
    peopleAhead: status.peopleAhead,
    estimatedWaitMinutes: status.estimatedWaitMinutes,
    qrPayload: `${env.publicAppUrl}/my-turn/${ticket.publicId}`,
    disclaimer: {
      en: "This OPD token is valid for today only. In case of sudden chest pain, heavy bleeding, or emergency, proceed immediately to Ground Floor Casualty without a token.",
      hi: "यह ओपीडी टोकन केवल आज के लिए मान्य है। सीने में दर्द, अत्यधिक रक्तस्राव या आपात स्थिति में बिना टोकन सीधे ग्राउंड फ्लोर कैजुअल्टी जाएं।",
      ta: "இந்த ஓபிடி டோக்கன் இன்று மட்டுமே செல்லுபடியாகும். அவசர காலங்களில் உடனடியாக தரைத்தள அவசர பிரிவுக்கு செல்லவும்.",
    },
  };
}
