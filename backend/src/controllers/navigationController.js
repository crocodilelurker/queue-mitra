import * as navigationService from "../services/navigationService.js";
import ApiError from "../utils/ApiError.js";

// GET /api/navigation/map
export function getMap(req, res) {
  res.json(navigationService.getHospitalLayout());
}

// GET /api/navigation/places
export function listPlaces(req, res) {
  const { floor, category, q } = req.query;
  let places = navigationService.getAllPlaces();

  if (floor !== undefined) {
    places = places.filter((p) => p.floor === Number(floor));
  }
  if (category) {
    places = places.filter((p) => p.category === category);
  }
  if (q) {
    const search = q.toLowerCase();
    places = places.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.landmark.en.toLowerCase().includes(search) ||
        p.landmark.hi?.includes(search)
    );
  }

  res.json({ places });
}

// POST /api/navigation/route: Dijkstra shortest path between two points
export function calculateRoute(req, res) {
  const { from, to, avoidStairs, language, departmentCode, room } = req.body ?? {};

  let startId = from;
  let endId = to;

  // Convenience resolution from slip details (department / room)
  if (!endId && (departmentCode || room)) {
    const place = navigationService.findPlaceByRoomOrDept(room, departmentCode);
    if (place) endId = place.id;
  }

  // Default start at Main Entrance if not provided
  if (!startId) {
    startId = "main_entrance_0";
  }

  if (!endId) {
    throw ApiError.badRequest("Destination place ('to', 'room', or 'departmentCode') is required");
  }

  const result = navigationService.findShortestPath(startId, endId, {
    avoidStairs: Boolean(avoidStairs),
    language: language || "en",
  });

  res.json(result);
}

// POST /api/navigation/lost: Patient is lost, navigate to nearest help desk & generate staff card
export function resolveLost(req, res) {
  const { currentPlaceId, currentFloor, destinationPlaceId, language } = req.body ?? {};

  const result = navigationService.resolveLost({
    currentPlaceId,
    currentFloor: Number(currentFloor) || 0,
    destinationPlaceId,
    language: language || "en",
  });

  res.json(result);
}

// GET /api/navigation/checkpoints: list physical QR checkpoints on walls/pillars
export function listCheckpoints(req, res) {
  res.json({ checkpoints: navigationService.getCheckpoints() });
}

// POST /api/navigation/from-checkpoint: route from scanned checkpoint poster
export function routeFromCheckpoint(req, res) {
  const { checkpointId, to, departmentCode, room, avoidStairs, language } = req.body ?? {};
  if (!checkpointId) throw ApiError.badRequest("checkpointId is required");

  res.json(
    navigationService.routeFromCheckpoint(checkpointId, {
      to,
      departmentCode,
      room,
      avoidStairs: Boolean(avoidStairs),
      language: language || "en",
    })
  );
}
