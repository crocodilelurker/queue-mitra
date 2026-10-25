// Demo auto-simulation: moves REAL queues forward on its own (call next -> the previous patient is
// completed) so a presenter can show the system working hands-free. It never creates patients.
import Department from "../models/Department.js";
import Ticket from "../models/Ticket.js";
import { serviceDate } from "../utils/date.js";
import { callNext } from "./queueService.js";

const BASE_STEP_MS = 30000; // 1x: one queue step every 30 seconds
const MIN_STEP_MS = 1000;

let timer = null;
let state = { hospitalId: null, intervalMs: null, speed: null, ticks: 0, startedAt: null, lastStepAt: null, lastAction: null };

export function getSimulationStatus() {
  return {
    isRunning: Boolean(timer),
    intervalMs: state.intervalMs,
    speed: state.speed,
    ticksCount: state.ticks,
    startedAt: state.startedAt,
    lastStepAt: state.lastStepAt,
    lastAction: state.lastAction,
  };
}

// hospitalId: only stop if it is this hospital's simulation (undefined = stop any).
export function stopAutoSimulation(hospitalId) {
  if (timer && (!hospitalId || String(state.hospitalId) === String(hospitalId))) {
    clearInterval(timer);
    timer = null;
  }
  return { ...getSimulationStatus(), message: "Auto-simulation stopped." };
}

// One step: for every department room with patients, finish the current patient and call the next one.
async function step(actor) {
  const date = serviceDate();
  const departments = await Department.find({ hospital: actor.hospital, isActive: true }).lean();
  const actions = [];
  for (const dept of departments) {
    const rooms = dept.rooms?.length ? dept.rooms : [null];
    for (const room of rooms) {
      const [waiting, calledHere] = await Promise.all([
        Ticket.exists({ department: dept._id, serviceDate: date, status: "waiting" }),
        Ticket.exists({ department: dept._id, serviceDate: date, status: "called", ...(room ? { room } : {}) }),
      ]);
      if (!waiting && !calledHere) continue;
      try {
        const result = await callNext(actor, { departmentCode: dept.code, room: room ?? undefined });
        actions.push(`${result.ticket.tokenNumber} -> ${room ?? dept.code}`);
      } catch (err) {
        // 404 "Queue is empty": the last patient in that room was completed.
        if (err.statusCode !== 404) throw err;
        actions.push(`${room ?? dept.code} finished`);
      }
    }
  }
  return actions;
}

/**
 * @param actor the signed-in admin (the steps run with their permissions)
 * @param intervalMs explicit step length, or
 * @param speed 1-20: speed 10 = one step every 3 seconds (default speed 10)
 */
export function startAutoSimulation(actor, { intervalMs, speed } = {}) {
  stopAutoSimulation();
  const s = Number(speed) > 0 ? Math.min(20, Number(speed)) : null;
  const ms = Number(intervalMs) > 0 ? Number(intervalMs) : BASE_STEP_MS / (s ?? 10);
  const stepMs = Math.max(MIN_STEP_MS, Math.min(120000, Math.round(ms)));

  state = {
    hospitalId: actor.hospital,
    intervalMs: stepMs,
    speed: Number((BASE_STEP_MS / stepMs).toFixed(1)),
    ticks: 0,
    startedAt: new Date().toISOString(),
    lastStepAt: null,
    lastAction: null,
  };

  let running = false;
  timer = setInterval(async () => {
    if (running) return; // never overlap steps
    running = true;
    try {
      const actions = await step(actor);
      state.ticks += 1;
      state.lastStepAt = new Date().toISOString();
      state.lastAction = actions.length ? actions.join(", ") : "No patients waiting";
    } catch (err) {
      console.error("Auto-simulation step failed:", err.message);
    } finally {
      running = false;
    }
  }, stepMs);
  timer.unref?.();

  return { ...getSimulationStatus(), message: `Auto-simulation started: one queue step every ${stepMs / 1000}s.` };
}
