import Department from "../models/Department.js";
import Ticket from "../models/Ticket.js";
import { findHospital } from "./hospitalService.js";
import { serviceDate } from "../utils/date.js";

export async function getHospitalAnalytics(hospitalCode = "CDH") {
  const hospital = await findHospital(hospitalCode);
  const date = serviceDate();

  const [tickets, departments] = await Promise.all([
    Ticket.find({ hospital: hospital._id, serviceDate: date }).populate("department").lean(),
    Department.find({ hospital: hospital._id, isActive: true }).lean(),
  ]);

  const totalTickets = tickets.length;
  const statusCounts = { waiting: 0, called: 0, completed: 0, no_show: 0, cancelled: 0 };
  const languageCounts = { en: 0, hi: 0, ta: 0, other: 0 };
  let assistedCount = 0;
  let urgentCount = 0;
  let totalResponseTimeSec = 0;
  let answeredUrgentCount = 0;

  const hourlyBuckets = { "09:00": 0, "10:00": 0, "11:00": 0, "12:00": 0, "13:00": 0, "14:00": 0 };

  for (const t of tickets) {
    if (statusCounts[t.status] !== undefined) statusCounts[t.status]++;

    const lang = t.language || "en";
    if (languageCounts[lang] !== undefined) languageCounts[lang]++;
    else languageCounts.other++;

    if (t.isAssisted) assistedCount++;

    if (t.urgent?.raised) {
      urgentCount++;
      if (t.urgent.responseTimeSeconds) {
        totalResponseTimeSec += t.urgent.responseTimeSeconds;
        answeredUrgentCount++;
      }
    }

    if (t.createdAt) {
      const hour = new Date(t.createdAt).getHours();
      const hourKey = `${String(hour).padStart(2, "0")}:00`;
      if (hourlyBuckets[hourKey] !== undefined) {
        hourlyBuckets[hourKey]++;
      }
    }
  }

  // Department Breakdown & Overcrowding Heatmap
  const departmentStats = departments.map((dept) => {
    const deptTickets = tickets.filter((t) => t.department?._id?.toString() === dept._id.toString());
    const waiting = deptTickets.filter((t) => t.status === "waiting").length;
    const completed = deptTickets.filter((t) => t.status === "completed").length;
    const capacity = dept.seatingCapacity || 15;
    const ratio = Number((waiting / capacity).toFixed(2));

    let overcrowding = "green";
    if (ratio > 1.0) overcrowding = "red";
    else if (ratio >= 0.7) overcrowding = "amber";

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
      complianceRate: avgUrgentResponseTimeSeconds <= 60 ? "100% compliant" : "Action required",
    },
    languages: languageCounts,
    hourlyTraffic: hourlyBuckets,
    departmentHeatmap: departmentStats,
    updatedAt: new Date().toISOString(),
  };
}
