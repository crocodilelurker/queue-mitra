import Counter from "../models/Counter.js";
import Department from "../models/Department.js";
import Hospital from "../models/Hospital.js";
import Ticket from "../models/Ticket.js";
import User, { DOCTOR_STATES } from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { serviceDate } from "../utils/date.js";
import { emit, rooms } from "../socket/index.js";
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

  const capacity = department.seatingCapacity || 15;
  const ratio = waiting.length / capacity;
  let overcrowdingColor = "green";
  let overcrowdingLabel = "Normal";
  if (ratio > 1.0) {
    overcrowdingColor = "red";
    overcrowdingLabel = "Overcrowded";
  } else if (ratio >= 0.7) {
    overcrowdingColor = "amber";
    overcrowdingLabel = "Busy";
  }

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
async function broadcastQueue(departmentId) {
  try {
    const ctx = await loadDepartmentContext(departmentId);
    const { snapshot, waiting } = await buildSnapshot(ctx);
    const hospitalId = ctx.department.hospital;

    emit(
      [rooms.department(departmentId), rooms.staff(hospitalId), rooms.board(hospitalId)],
      "queue:updated",
      snapshot
    );

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

      // When 3 people are ahead: trigger simulated SMS alert
      if (peopleAhead === 3) {
        try {
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
  departmentCode,
  patient,
  language,
  isAssisted = false,
  helperName,
  accessibility = {},
  isEmergency = false,
  complaint,
}) {
  const hospital = await findHospital(hospitalCode);
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
  if (isEmergency) await raiseUrgent(ticket.publicId);

  const status = await getTicketStatus(ticket.publicId);

  // Dispatch initial welcome SMS alert
  sendSimulatedSms({
    ticket,
    type: "registered",
    metadata: {
      deptName: department.name,
      room: department.rooms[0] || "Room 1",
      floor: department.floor,
      estimatedWaitMinutes: status.estimatedWaitMinutes,
    },
  }).catch(() => {});

  await broadcastQueue(department._id);
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
  const ticket = await Ticket.findOne({ publicId })
    .populate("hospital", "code name")
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
    isEmergency: Boolean(ticket.isEmergency),
    hospital: { code: ticket.hospital.code, name: ticket.hospital.name },
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
    emit(
      [rooms.board(doctor.hospital), rooms.department(doctor.department), rooms.staff(doctor.hospital)],
      "token:called",
      call
    );

    // Dispatch simulated SMS alert to called patient
    sendSimulatedSms({
      ticket: next,
      type: "called",
      metadata: {
        room: next.room,
        floor: next.department.floor,
        doctorName: doctor.name,
        deptName: next.department.name,
      },
    }).catch(() => {});
  }

  await broadcastQueue(doctor.department);

  return {
    completed: finished.map((t) => t.tokenNumber),
    called: next ? staffTicket(next) : null,
  };
}

async function closeTicket(doctor, ticketId, status, clinicalData = {}) {
  const update = { status };
  if (status === "completed") {
    update.completedAt = new Date();
    if (clinicalData.diagnosis) update.diagnosis = clinicalData.diagnosis;
    if (clinicalData.consultationNotes) update.consultationNotes = clinicalData.consultationNotes;
    if (clinicalData.prescriptions) update.prescriptions = clinicalData.prescriptions;
    if (clinicalData.followUpDate) update.followUpDate = clinicalData.followUpDate;
  }

  const ticket = await Ticket.findOneAndUpdate(
    { _id: ticketId, doctor: doctor._id, status: "called" },
    { $set: update },
    { returnDocument: "after" }
  );
  if (!ticket) throw ApiError.notFound("No called ticket with this id for this doctor");

  // If follow-up date was set, auto-schedule follow-up appointment
  if (clinicalData.followUpDate) {
    try {
      const Appointment = (await import("../models/Appointment.js")).default;
      const Counter = (await import("../models/Counter.js")).default;
      const year = new Date().getFullYear();
      const lastApt = await Appointment.findOne({
        appointmentId: new RegExp(`^APT-${year}-([0-9]+)$`),
      }).sort({ appointmentId: -1 });

      let nextNum = 1001;
      if (lastApt && lastApt.appointmentId) {
        const m = lastApt.appointmentId.match(/-([0-9]+)$/);
        if (m) nextNum = Math.max(nextNum, parseInt(m[1], 10) + 1);
      }

      await Counter.findOneAndUpdate(
        { _id: `appointment:${year}` },
        { $set: { seq: nextNum - 1000 } },
        { upsert: true }
      );

      await Appointment.create({
        appointmentId: `APT-${year}-${String(nextNum)}`,
        hospital: doctor.hospital,
        patientName: ticket.patient?.firstName,
        patientMobile: ticket.patient?.mobile,
        patientGender: ticket.patient?.gender,
        patientAge: ticket.patient?.age,
        doctor: doctor._id,
        doctorName: doctor.name,
        department: doctor.department,
        appointmentDate: clinicalData.followUpDate,
        slotTime: "10:00 AM",
        type: "follow_up",
        status: "booked",
        complaint: `Follow-up for: ${clinicalData.diagnosis || "Consultation review"}`,
      });
    } catch (err) {
      console.warn("Follow-up appointment auto-creation warning:", err.message);
    }
  }

  emit(rooms.ticket(ticket.publicId), "ticket:updated", { publicId: ticket.publicId, status });
  await broadcastQueue(ticket.department);
  return staffTicket(ticket);
}

export const completeTicket = (doctor, ticketId, clinicalData) => closeTicket(doctor, ticketId, "completed", clinicalData);
export const markNoShow = (doctor, ticketId) => closeTicket(doctor, ticketId, "no_show");

// Send a patient to the end of the queue (e.g. they stepped out or arrived late)
export async function requeueTicket(doctor, ticketId) {
  const ticket = await Ticket.findOne({
    _id: ticketId,
    hospital: doctor.hospital,
    status: { $in: ["called", "waiting"] },
  });
  if (!ticket) throw ApiError.notFound("Active ticket not found");

  const hospital = await Hospital.findById(ticket.hospital); // findHospital() takes a code, not an id
  const department = await Department.findById(ticket.department);
  const date = ticket.serviceDate || serviceDate();

  // Atomically fetch next sequence to place at the tail of the line
  const newSequence = await Counter.next(`${hospital.code}:${department.code}:${date}`);

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

  await broadcastQueue(department._id);
  return staffTicket(ticket);
}

// Move a patient to another department
export async function transferTicket(doctor, ticketId, targetDepartmentCode) {
  const ticket = await Ticket.findOne({
    _id: ticketId,
    hospital: doctor.hospital,
  });
  if (!ticket) throw ApiError.notFound("Ticket not found");

  const hospital = await Hospital.findById(ticket.hospital); // findHospital() takes a code, not an id
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
      room: newDept.rooms[0] || "Room",
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

  await Promise.all([
    broadcastQueue(oldDeptId),
    broadcastQueue(newDept._id),
  ]);

  return staffTicket(populated);
}

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
  if (updated.department) {
    await broadcastQueue(updated.department);

    if (state === "running_late") {
      Ticket.find({ department: updated.department, serviceDate: serviceDate(), status: "waiting" })
        .populate("department")
        .then((waitingList) => {
          waitingList.forEach((t) => {
            sendSimulatedSms({
              ticket: t,
              type: "doctor_delay",
              metadata: {
                room: updated.room || "Room",
                delayMinutes: status.delayMinutes,
              },
            }).catch(() => {});
          });
        })
        .catch(() => {});
    }
  }

  return updated;
}

// ---------- Urgent flags & Emergency SLA ----------
// The app never decides who is urgent. It only raises the flag so qualified staff see it immediately.

export async function raiseUrgent(publicId) {
  const ticket = await Ticket.findOneAndUpdate(
    { publicId },
    { $set: { "urgent.raised": true, "urgent.raisedAt": new Date(), "urgent.seenAt": null, "urgent.seenBy": null } },
    { returnDocument: "after" }
  ).populate("department", "code name floor");
  if (!ticket) throw ApiError.notFound("Ticket not found");

  emit(rooms.staff(ticket.hospital), "urgent:raised", {
    id: ticket._id,
    tokenNumber: ticket.tokenNumber,
    firstName: ticket.patient.firstName,
    department: ticket.department.name,
    isEmergency: Boolean(ticket.isEmergency),
    complaint: ticket.complaint ?? null,
    raisedAt: ticket.urgent.raisedAt,
  });

  return { publicId: ticket.publicId, urgentRaised: true, raisedAt: ticket.urgent.raisedAt };
}

export async function listUrgentFlags(doctor) {
  const tickets = await Ticket.find({ hospital: doctor.hospital, "urgent.raised": true, "urgent.seenAt": null })
    .sort({ "urgent.raisedAt": 1 })
    .populate("department", "code name floor")
    .lean();

  return tickets.map((t) => ({ ...staffTicket(t), department: t.department }));
}

export async function acknowledgeUrgent(doctor, ticketId) {
  const existing = await Ticket.findOne({
    _id: ticketId,
    hospital: doctor.hospital,
    "urgent.raised": true,
    "urgent.seenAt": null,
  });
  if (!existing) throw ApiError.notFound("No unseen urgent flag on this ticket");

  const now = new Date();
  const responseTimeSeconds = existing.urgent?.raisedAt
    ? Math.max(1, Math.round((now - existing.urgent.raisedAt) / 1000))
    : 0;

  const ticket = await Ticket.findOneAndUpdate(
    { _id: ticketId, hospital: doctor.hospital, "urgent.raised": true, "urgent.seenAt": null },
    {
      $set: {
        "urgent.seenAt": now,
        "urgent.seenBy": doctor._id,
        "urgent.responseTimeSeconds": responseTimeSeconds,
      },
    },
    { returnDocument: "after" }
  );

  emit(rooms.staff(doctor.hospital), "urgent:seen", {
    id: ticket._id,
    seenBy: doctor.name,
    responseTimeSeconds,
  });
  emit(rooms.ticket(ticket.publicId), "ticket:updated", { publicId: ticket.publicId, urgentSeen: true });
  return staffTicket(ticket);
}

// "I have my slip": Look up a ticket by its printed token number (e.g. MED-001)
export async function getTicketByTokenNumber(hospitalCode, tokenNumber) {
  const hospital = await findHospital(hospitalCode);
  const date = serviceDate();
  const ticket = await Ticket.findOne({
    hospital: hospital._id,
    serviceDate: date,
    tokenNumber: String(tokenNumber).toUpperCase().trim(),
  }).select("publicId");
  if (!ticket) throw ApiError.notFound(`No active ticket found today with token ${tokenNumber}`);
  return getTicketStatus(ticket.publicId);
}

// Update patient accessibility & language preferences
export async function updateTicketPreferences(publicId, { accessibility = {}, language }) {
  const update = {};
  if (language) update.language = language;
  for (const [k, v] of Object.entries(accessibility)) {
    update[`accessibility.${k}`] = Boolean(v);
  }

  const ticket = await Ticket.findOneAndUpdate(
    { publicId },
    { $set: update },
    { returnDocument: "after" }
  ).populate("hospital department doctor");
  if (!ticket) throw ApiError.notFound("Ticket not found");

  return getTicketStatus(ticket.publicId);
}

// Full OPD Slip payload for printing, image saving, and offline caching
export async function getTicketSlip(publicId) {
  const ticket = await Ticket.findOne({ publicId })
    .populate("hospital", "code name address contact")
    .populate("department", "code name floor rooms description")
    .populate("doctor", "name")
    .lean();
  if (!ticket) throw ApiError.notFound("Ticket not found");

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
    room: ticket.room || ticket.department.rooms[0] || "Room 1",
    doctorName: ticket.doctor?.name ?? "Assigned OPD Specialist",
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
    qrPayload: `https://queuemitra.in/my-turn/${ticket.publicId}`,
    disclaimer: {
      en: "This OPD token is valid for today only. In case of sudden chest pain, heavy bleeding, or emergency, proceed immediately to Ground Floor Casualty without a token.",
      hi: "यह ओपीडी टोकन केवल आज के लिए मान्य है। सीने में दर्द, अत्यधिक रक्तस्राव या आपात स्थिति में बिना टोकन सीधे ग्राउंड फ्लोर कैजुअल्टी जाएं।",
      ta: "இந்த ஓபிடி டோக்கன் இன்று மட்டுமே செல்லுபடியாகும். அவசர காலங்களில் உடனடியாக தரைத்தள அவசர பிரிவுக்கு செல்லவும்.",
    },
  };
}
