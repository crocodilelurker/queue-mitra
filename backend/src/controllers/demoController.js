import * as demoService from "../services/demoService.js";

// POST /api/demo/auto-simulate/start { intervalMs?, speed? }: advances the signed-in admin's real queues.
export function startSimulation(req, res) {
  const { intervalMs, speed } = req.body ?? {};
  res.json(demoService.startAutoSimulation(req.user, { intervalMs, speed }));
}

// POST /api/demo/auto-simulate/stop
export function stopSimulation(req, res) {
  res.json(demoService.stopAutoSimulation(req.user.hospital));
}

// GET /api/demo/auto-simulate/status
export function getSimulationStatus(req, res) {
  res.json(demoService.getSimulationStatus());
}
