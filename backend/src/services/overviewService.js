import Department from "../models/Department.js";
import Hospital from "../models/Hospital.js";
import Ticket from "../models/Ticket.js";
import UrgentFlag from "../models/UrgentFlag.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import { serviceDate } from "../utils/date.js";
import { averageConsultMinutes, crowdLevel, estimateWait, serializeFlag } from "./queueService.js";

function doctorStatus(d) {
  const s = d.status ?? {};
  const state = s.state ?? "offline";
  return {
    state,
    until: state === "on_break" ? s.until ?? null : null,
    delayMinutes: state === "running_late" ? s.delayMinutes ?? 0 : 0,
  };
}

function doctorDelay(d, now) {
  const { state, until, delayMinutes } = d.status ?? {};
  if (state === "running_late") return delayMinutes || 0;
  if (state === "on_break" && until) return Math.max(0, (new Date(until) - now) / 60000);
  return 0;
}

/**
 * Everything the live queue console needs in one call (GET /api/staff/overview).
 * Wait estimates use the same formula as the patient screens (queueService.estimateWait).
 */
export async function buildStaffOverview(hospitalId) {
  const hospital = await Hospital.findById(hospitalId).lean();
  if (!hospital) throw ApiError.notFound("Hospital not found");
  const date = serviceDate();
  const now = new Date();

  const [departments, tickets, doctors, openFlags, counts] = await Promise.all([
    Department.find({ hospital: hospital._id, isActive: true }).sort({ floor: 1, code: 1 }).lean(),
    Ticket.find({ hospital: hospital._id, serviceDate: date, status: { $in: ["waiting", "called"] } })
      .sort({ sequence: 1 })
      .lean(),
    User.find({ hospital: hospital._id, role: "doctor" }).select("name room status department specialty").sort({ name: 1 }).lean(),
    UrgentFlag.find({ hospital: hospital._id, seenAt: null }).sort({ raisedAt: 1 }).lean(),
    Ticket.aggregate([{ $match: { hospital: hospital._id, serviceDate: date } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);

  const byStatus = Object.fromEntries(counts.map((c) => [c._id, c.n]));
  const doctorNames = new Map(doctors.map((d) => [String(d._id), d.name]));

  const departmentViews = await Promise.all(
    departments.map(async (dept) => {
      const id = String(dept._id);
      const waiting = tickets.filter((t) => String(t.department) === id && t.status === "waiting");
      const called = tickets
        .filter((t) => String(t.department) === id && t.status === "called")
        .sort((a, b) => new Date(b.calledAt) - new Date(a.calledAt));
      const deptDoctors = doctors.filter((d) => String(d.department) === id);

      const onDuty = deptDoctors.filter((d) => d.status?.state && d.status.state !== "offline");
      const ctx = {
        avgConsult: await averageConsultMinutes(dept),
        doctorsOnDuty: Math.max(1, onDuty.length),
        delay: onDuty.length ? Math.min(...onDuty.map((d) => doctorDelay(d, now))) : 0,
      };
      const crowd = crowdLevel(waiting.length, dept.seatingCapacity);

      return {
        _id: dept._id,
        code: dept.code,
        name: dept.name,
        description: dept.description ?? "",
        icon: dept.icon ?? null,
        translations: dept.translations ?? {},
        rooms: dept.rooms ?? [],
        floor: dept.floor,
        seatingCapacity: crowd.capacity,
        avgConsultMinutes: Math.round(ctx.avgConsult),
        opdHours: dept.opdHours,
        waitingCount: waiting.length,
        estimatedWaitMinutes: estimateWait(waiting.length, ctx),
        crowd: crowd.status,
        crowdLabel: crowd.label,
        crowdRatio: Number(crowd.ratio.toFixed(2)),
        nowServing: called.map((t) => ({
          ticketId: t._id,
          publicId: t.publicId,
          tokenNumber: t.tokenNumber,
          firstName: t.patient?.firstName,
          room: t.room,
          calledAt: t.calledAt,
          doctorId: t.doctor ?? null,
          doctorName: t.doctor ? doctorNames.get(String(t.doctor)) ?? null : null,
          isEmergency: Boolean(t.isEmergency),
        })),
        waiting: waiting.map((t, i) => ({
          ticketId: t._id,
          publicId: t.publicId,
          tokenNumber: t.tokenNumber,
          firstName: t.patient?.firstName,
          age: t.patient?.age,
          gender: t.patient?.gender,
          language: t.language,
          assisted: Boolean(t.isAssisted),
          urgent: Boolean(t.urgent?.raised && !t.urgent?.seenAt),
          isEmergency: Boolean(t.isEmergency),
          complaint: t.complaint ?? null,
          accessibility: t.accessibility ?? {},
          position: i + 1,
          estimatedWaitMinutes: estimateWait(i, ctx),
          createdAt: t.createdAt,
        })),
        doctors: deptDoctors.map((d) => ({
          _id: d._id,
          name: d.name,
          room: d.room,
          specialty: d.specialty ?? null,
          status: doctorStatus(d),
        })),
      };
    })
  );

  return {
    generatedAt: now.toISOString(),
    serviceDate: date,
    hospital: { _id: hospital._id, code: hospital.code, name: hospital.name },
    totals: {
      registeredToday: Object.values(byStatus).reduce((a, b) => a + b, 0),
      waiting: byStatus.waiting ?? 0,
      serving: byStatus.called ?? 0,
      completed: byStatus.completed ?? 0,
      noShow: byStatus.no_show ?? 0,
      urgentOpen: openFlags.length,
    },
    urgent: openFlags.map(serializeFlag),
    departments: departmentViews,
  };
}

export function serializeDoctor(d, deptById = new Map()) {
  const dept = d.department ? deptById.get(String(d.department._id ?? d.department)) ?? d.department : null;
  return {
    _id: d._id,
    name: d.name,
    email: d.email,
    role: "doctor",
    department: dept?._id ?? d.department ?? null,
    departmentCode: dept?.code ?? null,
    departmentName: dept?.name ?? null,
    room: d.room ?? null,
    specialty: d.specialty ?? null,
    status: doctorStatus(d),
    createdAt: d.createdAt,
  };
}
