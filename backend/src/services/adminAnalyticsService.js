import Patient from "../models/Patient.js";
import Appointment from "../models/Appointment.js";
import Ticket from "../models/Ticket.js";
import User from "../models/User.js";
import Department from "../models/Department.js";
import Hospital from "../models/Hospital.js";
import { getFinancialSummary } from "./billingService.js";

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function getCentralAdminOverview(hospitalCode = "CDH") {
  const hospital = await Hospital.findOne({ code: hospitalCode });
  const today = todayDate();

  const [
    totalPatientsCount,
    todayAppointments,
    todayTickets,
    doctors,
    departments,
    financialSummary,
  ] = await Promise.all([
    Patient.countDocuments(),
    Appointment.find({ appointmentDate: today }).lean(),
    Ticket.find({ serviceDate: today }).lean(),
    User.find({ role: "doctor" }).populate("department").lean(),
    Department.find({ isActive: true }).lean(),
    getFinancialSummary(today),
  ]);

  // Appointment metrics
  const appointmentStats = {
    total: todayAppointments.length,
    booked: todayAppointments.filter((a) => a.status === "booked").length,
    inQueue: todayAppointments.filter((a) => a.status === "in_queue").length,
    completed: todayAppointments.filter((a) => a.status === "completed").length,
    cancelled: todayAppointments.filter((a) => a.status === "cancelled").length,
  };

  // Queue metrics
  const waitingTickets = todayTickets.filter((t) => t.status === "waiting");
  const calledTickets = todayTickets.filter((t) => t.status === "called");
  const completedTickets = todayTickets.filter((t) => t.status === "completed");

  // Doctor availability
  const doctorsAvailable = doctors.filter((d) => d.status?.state === "available").length;
  const doctorsOnBreak = doctors.filter((d) => d.status?.state === "on_break").length;
  const doctorsLate = doctors.filter((d) => d.status?.state === "running_late").length;
  const doctorsOffline = doctors.filter((d) => !d.status?.state || d.status?.state === "offline").length;

  // Live Department Queue Tracker Matrix
  const liveQueueTracker = departments.map((dept) => {
    const deptTickets = todayTickets.filter((t) => String(t.department) === String(dept._id));
    const nowServing = deptTickets.find((t) => t.status === "called");
    const waiting = deptTickets
      .filter((t) => t.status === "waiting")
      .sort((a, b) => a.sequence - b.sequence);

    const doc = doctors.find((d) => String(d.department?._id || d.department) === String(dept._id));

    return {
      code: dept.code,
      name: dept.name,
      room: dept.rooms?.[0] || "Room 1",
      floor: dept.floor,
      doctorName: doc?.name || "On Duty",
      doctorStatus: doc?.status?.state || "available",
      doctorDelayMinutes: doc?.status?.delayMinutes || 0,
      nowServingToken: nowServing?.tokenNumber || "None",
      nowServingPatient: nowServing?.patient?.firstName || "—",
      nextInLine: waiting.slice(0, 3).map((w) => ({
        token: w.tokenNumber,
        name: w.patient?.firstName,
        isEmergency: w.isEmergency,
      })),
      totalWaiting: waiting.length,
      estimatedWaitMinutes: waiting.length * (dept.avgConsultMinutes || 8),
      capacity: dept.seatingCapacity || 15,
      congestionLevel: waiting.length > dept.seatingCapacity ? "red" : waiting.length > dept.seatingCapacity * 0.7 ? "amber" : "green",
    };
  });

  return {
    hospital: {
      code: hospital?.code || "CDH",
      name: hospital?.name || "City District Hospital",
      date: today,
    },
    metrics: {
      totalRegisteredPatients: totalPatientsCount,
      activeAppointmentsToday: appointmentStats.total,
      currentlyWaitingQueue: waitingTickets.length,
      completedConsultationsToday: completedTickets.length + appointmentStats.completed,
      availableDoctorsCount: doctorsAvailable,
      doctorsTotalCount: doctors.length,
      todayRevenueCollected: financialSummary.totalCollected,
      pendingBillingAmount: financialSummary.pendingAmount,
    },
    kpis: {
      totalPatients: totalPatientsCount,
      activeAppointments: appointmentStats.total,
      waitingInQueue: waitingTickets.length,
      completedToday: completedTickets.length + appointmentStats.completed,
      availableDoctors: doctorsAvailable,
      totalDoctors: doctors.length,
      pendingPayments: Math.ceil((financialSummary.pendingAmount || 0) / 20) || 0,
      totalRevenueToday: financialSummary.totalCollected,
      totalWaivedToday: financialSummary.totalWaived,
    },
    queueSummary: {
      waiting: waitingTickets.length,
      inConsultation: calledTickets.length,
      completed: completedTickets.length,
    },
    doctorStatusSummary: {
      available: doctorsAvailable,
      onBreak: doctorsOnBreak,
      runningLate: doctorsLate,
      offline: doctorsOffline,
    },
    financialSummary,
    liveQueueTracker,
    liveQueueMatrix: liveQueueTracker.map((dept) => ({
      code: dept.code,
      name: dept.name,
      nameHi: dept.name,
      activeTokens: dept.nowServingToken !== "None" ? [dept.nowServingToken] : [],
      waitingCount: dept.totalWaiting,
      callingCount: dept.nowServingToken !== "None" ? 1 : 0,
      avgWaitMinutes: dept.estimatedWaitMinutes || 8,
      congestionLevel: dept.congestionLevel === 'green' ? 'low' : dept.congestionLevel === 'amber' ? 'moderate' : 'high',
      activeDoctors: dept.doctorStatus === 'available' ? 1 : 0,
    })),
    doctors: doctors.map((d) => ({
      _id: d._id,
      name: d.name,
      specialty: d.specialty || d.department?.name || 'General Medicine',
      status: d.status?.state === 'available' ? 'on_duty' : d.status?.state || 'off_duty',
      room: d.department?.rooms?.[0] || 'OPD-1',
      consultationFee: d.consultationFee || 20,
    })),
    dailySchedule: todayAppointments.slice(0, 10),
  };
}
