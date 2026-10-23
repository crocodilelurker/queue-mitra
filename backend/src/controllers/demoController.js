import * as demoService from "../services/demoService.js";

// POST /api/demo/seed-patients: Seed 20 sample patients across departments
export async function seedPatients(req, res) {
  const { hospitalCode = "CDH" } = req.body ?? {};
  res.json(await demoService.seedDemoPatients(hospitalCode));
}

// POST /api/demo/reset: Reset tickets, counters, and doctor states for demo
export async function resetDemo(req, res) {
  const { hospitalCode = "CDH" } = req.body ?? {};
  res.json(await demoService.resetDemoState(hospitalCode));
}

// POST /api/demo/auto-simulate/start: 10x speed progression of queues
export async function startSimulation(req, res) {
  const { intervalMs, hospitalCode = "CDH" } = req.body ?? {};
  res.json(await demoService.startAutoSimulation({ intervalMs: Number(intervalMs) || 3000, hospitalCode }));
}

// POST /api/demo/auto-simulate/stop: Halt auto-runner
export function stopSimulation(req, res) {
  res.json(demoService.stopAutoSimulation());
}

// GET /api/demo/auto-simulate/status: Check status
export function getSimulationStatus(req, res) {
  res.json(demoService.getSimulationStatus());
}
