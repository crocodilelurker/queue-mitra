import Counter from "../models/Counter.js";
import Department from "../models/Department.js";
import Ticket from "../models/Ticket.js";
import User from "../models/User.js";
import { findHospital } from "./hospitalService.js";
import { serviceDate } from "../utils/date.js";
import { emit, rooms } from "../socket/index.js";
import { callNext, getQueueSnapshot } from "./queueService.js";

const SAMPLE_PATIENTS = [
  { firstName: "Kamla", age: 62, gender: "female", dept: "MED", lang: "hi" },
  { firstName: "Ramesh", age: 45, gender: "male", dept: "MED", lang: "en" },
  { firstName: "Sunil", age: 38, gender: "male", dept: "MED", lang: "hi" },
  { firstName: "Geeta", age: 50, gender: "female", dept: "MED", lang: "hi" },
  { firstName: "Aarav", age: 5, gender: "male", dept: "CHD", lang: "en" },
  { firstName: "Ananya", age: 8, gender: "female", dept: "CHD", lang: "hi" },
  { firstName: "Pooja", age: 28, gender: "female", dept: "WOM", lang: "hi" },
  { firstName: "Deepa", age: 31, gender: "female", dept: "WOM", lang: "te" },
  { firstName: "Harish", age: 64, gender: "male", dept: "ORT", lang: "hi" },
  { firstName: "Manish", age: 42, gender: "male", dept: "ORT", lang: "en" },
  { firstName: "Vikram", age: 29, gender: "male", dept: "ORT", lang: "en" },
  { firstName: "Suresh", age: 55, gender: "male", dept: "ENT", lang: "hi" },
  { firstName: "Kavita", age: 34, gender: "female", dept: "ENT", lang: "hi" },
  { firstName: "Lakshmi", age: 48, gender: "female", dept: "EYE", lang: "te" },
  { firstName: "Mohan", age: 70, gender: "male", dept: "EYE", lang: "hi" },
  { firstName: "Rahul", age: 22, gender: "male", dept: "SKN", lang: "en" },
  { firstName: "Shalini", age: 26, gender: "female", dept: "SKN", lang: "hi" },
  { firstName: "Vijay", age: 58, gender: "male", dept: "MED", lang: "hi" },
  { firstName: "Srinivas", age: 45, gender: "male", dept: "MED", lang: "te" },
  { firstName: "Fatima", age: 36, gender: "female", dept: "WOM", lang: "en" },
  { firstName: "Gurpreet", age: 11, gender: "male", dept: "CHD", lang: "hi" },
];

export async function seedDemoPatients(hospitalCode = "CDH") {
  const hospital = await findHospital(hospitalCode);
  const departments = await Department.find({ hospital: hospital._id, isActive: true });
  const deptMap = new Map(departments.map((d) => [d.code, d]));
  const date = serviceDate();

  const createdTickets = [];

  for (const p of SAMPLE_PATIENTS) {
    const dept = deptMap.get(p.dept) || departments[0];
    const sequence = await Counter.next(`${hospital.code}:${dept.code}:${date}`);
    const tokenNumber = `${dept.code}-${String(sequence).padStart(3, "0")}`;

    const ticket = await Ticket.create({
      tokenNumber,
      sequence,
      serviceDate: date,
      hospital: hospital._id,
      department: dept._id,
      patient: {
        firstName: p.firstName,
        age: p.age,
        gender: p.gender,
        mobile: "9876543210",
      },
      language: p.lang || "en",
      status: "waiting",
    });

    createdTickets.push({
      publicId: ticket.publicId,
      tokenNumber: ticket.tokenNumber,
      firstName: ticket.patient.firstName,
      departmentCode: dept.code,
    });
  }

  // Refresh all department queues via sockets
  for (const dept of departments) {
    try {
      const snap = await getQueueSnapshot(dept._id);
      emit([rooms.department(dept._id), rooms.staff(hospital._id), rooms.board(hospital._id)], "queue:updated", snap);
    } catch {
      // safe continue
    }
  }

  return {
    message: `Successfully seeded ${createdTickets.length} sample patients across all OPD departments.`,
    count: createdTickets.length,
    tickets: createdTickets,
  };
}

export async function resetDemoState(hospitalCode = "CDH") {
  const hospital = await findHospital(hospitalCode);
  const departments = await Department.find({ hospital: hospital._id });
  const deptIds = departments.map((d) => d._id);

  // Clear tickets for this hospital
  await Ticket.deleteMany({ hospital: hospital._id });

  // Clear counters
  const date = serviceDate();
  for (const dept of departments) {
    await Counter.deleteOne({ _id: `${hospital.code}:${dept.code}:${date}` });
  }

  // Reset doctors in this hospital to available
  await User.updateMany(
    { hospital: hospital._id, role: "doctor" },
    { $set: { status: { state: "available", until: null, delayMinutes: 0 } } }
  );

  // Broadcast fresh empty queues
  for (const dept of departments) {
    try {
      const snap = await getQueueSnapshot(dept._id);
      emit([rooms.department(dept._id), rooms.staff(hospital._id), rooms.board(hospital._id)], "queue:updated", snap);
    } catch {
      // safe continue
    }
  }

  return {
    message: "Demo reset complete: all tickets, counters, and doctor delays have been cleared.",
    hospitalCode: hospital.code,
  };
}

let simulationTimer = null;
let simulationTicks = 0;

export function getSimulationStatus() {
  return {
    isRunning: Boolean(simulationTimer),
    ticksCount: simulationTicks,
    speed: "10x simulation (3s step)",
  };
}

export function stopAutoSimulation() {
  if (simulationTimer) {
    clearInterval(simulationTimer);
    simulationTimer = null;
  }
  return { isRunning: false, message: "Auto-simulation stopped." };
}

export async function startAutoSimulation({ intervalMs = 3000, hospitalCode = "CDH" } = {}) {
  stopAutoSimulation();
  simulationTicks = 0;

  const hospital = await findHospital(hospitalCode);
  const doctors = await User.find({ hospital: hospital._id, role: "doctor" });
  if (!doctors.length) throw new Error("No doctors found for simulation");

  let doctorIndex = 0;

  simulationTimer = setInterval(async () => {
    try {
      simulationTicks++;
      const doctor = doctors[doctorIndex % doctors.length];
      doctorIndex++;

      // Check if department has waiting tickets
      const waitingCount = await Ticket.countDocuments({
        department: doctor.department,
        serviceDate: serviceDate(),
        status: "waiting",
      });

      if (waitingCount > 0) {
        await callNext(doctor);
      }
    } catch (err) {
      console.error("Auto simulation step failed:", err);
    }
  }, intervalMs);

  return {
    isRunning: true,
    message: `10x Auto-simulation started. Progressing queue every ${intervalMs / 1000}s.`,
    intervalMs,
  };
}
