import {
  calculateRoute,
  getMap,
  listCheckpoints,
  listPlaces,
  resolveLost,
  routeFromCheckpoint,
} from "../controllers/navigationController.js";

const router = Router();

// Public navigation endpoints (patients, kiosk, staff)
router.get("/map", getMap);
router.get("/places", listPlaces);
router.get("/checkpoints", listCheckpoints);
router.post("/route", calculateRoute);
router.post("/from-checkpoint", routeFromCheckpoint);
router.post("/lost", resolveLost);

export default router;
