import env from "../config/env.js";
import Department from "../models/Department.js";
import Ticket from "../models/Ticket.js";
import UrgentFlag from "../models/UrgentFlag.js";
import { findHospital } from "./hospitalService.js";
import { crowdLevel } from "./queueService.js";
import { serviceDate } from "../utils/date.js";

const hourIn = (date) =>
  Number(new Date(date).toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: env.timeZone }).slice(0, 2)) % 24;

export async function getHospitalAnalytics(hospitalCode) {
  const hospital = await findHospital(hospitalCode);
  const date = serviceDate();

  const [tickets, departments, flags] = await Promise.all([
    Ticket.find({ hospital: hospital._id, serviceDate: date }).populate("department").lean(),
    Department.find({ hospital: hospital._id, isActive: true }).lean(),
    // Urgent requests raised today (with or without a ticket)
    UrgentFlag.find({ hospital: hospital._id, raisedAt: { $gte: new Date(Date.now() - 24 * 3600 * 1000) } }).lean(),
  ]);

  const totalTickets = tickets.length;
  const statusCounts = { waiting: 0, called: 0, completed: 0, no_show: 0, cancelled: 0 };
  const languageCounts = { hi: 0, en: 0, te: 0, ta: 0, other: 0 };
  let assistedCount = 0;
  const todaysFlags = flags.filter((f) => serviceDate(new Date(f.raisedAt)) === date);
  const urgentCount = todaysFlags.length;
  const answered = todaysFlags.filter((f) => f.responseTimeSeconds);
  const totalResponseTimeSec = answered.reduce((sum, f) => sum + f.responseTimeSeconds, 0);
  const answeredUrgentCount = answered.length;

  // Registrations per hour (hospital time), 08:00-17:00 plus any other hour that had registrations.
  const hourlyBuckets = {};
  for (let h = 8; h <= 17; h += 1) hourlyBuckets[`${String(h).padStart(2, "0")}:00`] = 0;

  for (const t of tickets) {
    if (statusCounts[t.status] !== undefined) statusCounts[t.status]++;

    const lang = t.language || "en";
    if (languageCounts[lang] !== undefined) languageCounts[lang]++;
    else languageCounts.other++;

    if (t.isAssisted) assistedCount++;

    if (t.createdAt) {
      const hourKey = `${String(hourIn(t.createdAt)).padStart(2, "0")}:00`;
      hourlyBuckets[hourKey] = (hourlyBuckets[hourKey] ?? 0) + 1;
    }
  }

  // Department Breakdown & Overcrowding Heatmap
  const departmentStats = departments.map((dept) => {
    const deptTickets = tickets.filter((t) => t.department?._id?.toString() === dept._id.toString());
    const waiting = deptTickets.filter((t) => t.status === "waiting").length;
    const completed = deptTickets.filter((t) => t.status === "completed").length;
    const crowd = crowdLevel(waiting, dept.seatingCapacity);
    const capacity = crowd.capacity;
    const ratio = Number(crowd.ratio.toFixed(2));
    const overcrowding = crowd.status;

    return {
      code: dept.code,
      name: dept.name,
      floor: dept.floor,
      waitingCount: waiting,
      completedCount: completed,
      capacity,
      ratio,
      overcrowding,
      avgConsultMinutes: dept.avgConsultMinutes,
    };
  });

  const avgUrgentResponseTimeSeconds = answeredUrgentCount
    ? Math.round(totalResponseTimeSec / answeredUrgentCount)
    : 0;

  return {
    hospital: {
      code: hospital.code,
      name: hospital.name,
    },
    serviceDate: date,
    overview: {
      totalPatientsToday: totalTickets,
      currentlyWaiting: statusCounts.waiting,
      inConsultation: statusCounts.called,
      completedToday: statusCounts.completed,
      noShowCount: statusCounts.no_show,
      assistedCount,
    },
    emergencySLA: {
      totalUrgentFlagsRaised: urgentCount,
      flagsResolved: answeredUrgentCount,
      averageResponseTimeSeconds: avgUrgentResponseTimeSeconds,
      targetSlaSeconds: 60,
      openFlags: todaysFlags.filter((f) => !f.seenAt).length,
      complianceRate: !answeredUrgentCount
        ? "No urgent requests yet"
        : avgUrgentResponseTimeSeconds <= 60
          ? "Within target"
          : "Action required",
    },
    languages: languageCounts,
    hourlyTraffic: Object.fromEntries(Object.entries(hourlyBuckets).sort(([a], [b]) => a.localeCompare(b))),
    departmentHeatmap: departmentStats,
    updatedAt: new Date().toISOString(),
  };
}
