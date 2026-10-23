import { CHECKPOINTS, HOSPITAL_FLOORS, PATH_EDGES, PLACES } from "../data/hospitalMapData.js";
import ApiError from "../utils/ApiError.js";

// Lookup maps for fast access
const placesById = new Map(PLACES.map((p) => [p.id, p]));

export function getAllPlaces() {
  return PLACES;
}

export function getHospitalLayout() {
  return {
    floors: HOSPITAL_FLOORS,
    places: PLACES,
    edges: PATH_EDGES,
  };
}

export function findPlaceById(placeId) {
  return placesById.get(placeId) || null;
}

// Find destination node from room name or department code
export function findPlaceByRoomOrDept(roomName, deptCode) {
  if (roomName) {
    const byRoom = PLACES.find(
      (p) => p.name.toLowerCase().includes(roomName.toLowerCase()) || p.id.toLowerCase().includes(roomName.toLowerCase())
    );
    if (byRoom) return byRoom;
  }
  if (deptCode) {
    const byDept = PLACES.find((p) => p.departmentCode === deptCode.toUpperCase());
    if (byDept) return byDept;
  }
  return null;
}

// Build adjacency graph with optional stairs exclusion
function buildGraph(avoidStairs = false) {
  const adj = new Map();
  for (const place of PLACES) {
    adj.set(place.id, []);
  }

  for (const edge of PATH_EDGES) {
    // If avoidStairs is true, skip edges that use stairs
    if (avoidStairs && edge.usesStairs) {
      continue;
    }

    if (!adj.has(edge.from)) adj.set(edge.from, []);
    if (!adj.has(edge.to)) adj.set(edge.to, []);

    adj.get(edge.from).push({
      to: edge.to,
      distance: edge.distanceMeters,
      usesStairs: Boolean(edge.usesStairs),
      hint: edge.hint,
    });

    // Bidirectional
    adj.get(edge.to).push({
      to: edge.from,
      distance: edge.distanceMeters,
      usesStairs: Boolean(edge.usesStairs),
      hint: edge.hint,
    });
  }

  return adj;
}

// Dijkstra's Shortest Path Algorithm
export function findShortestPath(startId, endId, { avoidStairs = false, language = "en" } = {}) {
  const start = placesById.get(startId);
  const end = placesById.get(endId);

  if (!start) throw ApiError.badRequest(`Unknown start place: ${startId}`);
  if (!end) throw ApiError.badRequest(`Unknown destination place: ${endId}`);

  if (startId === endId) {
    return {
      start,
      end,
      totalDistanceMeters: 0,
      estimatedWalkMinutes: 0,
      avoidStairsUsed: avoidStairs,
      floorChanges: [],
      pathNodes: [start],
      steps: [
        {
          stepNumber: 1,
          place: start,
          instruction: `You are already at ${start.name}.`,
          landmark: start.landmark[language] || start.landmark.en,
          distanceMeters: 0,
        },
      ],
    };
  }

  const graph = buildGraph(avoidStairs);
  const distances = new Map();
  const previous = new Map();
  const edgeHints = new Map();
  const unvisited = new Set();

  for (const place of PLACES) {
    distances.set(place.id, Infinity);
    unvisited.add(place.id);
  }
  distances.set(startId, 0);

  while (unvisited.size > 0) {
    // Pick unvisited node with smallest distance
    let currentId = null;
    let minDistance = Infinity;

    for (const id of unvisited) {
      const dist = distances.get(id);
      if (dist < minDistance) {
        minDistance = dist;
        currentId = id;
      }
    }

    if (currentId === null || minDistance === Infinity) {
      break; // No reachable nodes left
    }

    if (currentId === endId) {
      break; // Reached destination
    }

    unvisited.delete(currentId);

    const neighbors = graph.get(currentId) || [];
    for (const neighbor of neighbors) {
      if (!unvisited.has(neighbor.to)) continue;

      const alt = distances.get(currentId) + neighbor.distance;
      if (alt < distances.get(neighbor.to)) {
        distances.set(neighbor.to, alt);
        previous.set(neighbor.to, currentId);
        edgeHints.set(`${currentId}->${neighbor.to}`, neighbor);
      }
    }
  }

  // Reconstruct path
  if (!previous.has(endId) && startId !== endId) {
    throw ApiError.badRequest(
      avoidStairs
        ? "No accessible route found avoiding stairs between these locations."
        : "No route found between these locations."
    );
  }

  const path = [];
  let curr = endId;
  while (curr) {
    path.unshift(placesById.get(curr));
    curr = previous.get(curr);
  }

  // Generate step-by-step instructions with landmarks
  const steps = [];
  const floorChanges = [];
  let totalDistance = 0;

  for (let i = 0; i < path.length; i++) {
    const node = path[i];
    const prevNode = path[i - 1];

    if (i === 0) {
      steps.push({
        stepNumber: 1,
        placeId: node.id,
        name: node.name,
        floor: node.floor,
        landmark: node.landmark[language] || node.landmark.en,
        instruction: `Start at ${node.name} (Floor ${node.floor}).`,
        distanceMeters: 0,
      });
      continue;
    }

    const edgeKey = `${prevNode.id}->${node.id}`;
    const edge = edgeHints.get(edgeKey) || { distance: 10, hint: `Walk towards ${node.name}` };
    totalDistance += edge.distance;

    let instruction = edge.hint;
    if (prevNode.floor !== node.floor) {
      const isUp = node.floor > prevNode.floor;
      const mode = edge.usesStairs ? "stairs" : "lift";
      instruction = `Take the ${mode} ${isUp ? "up" : "down"} to Floor ${node.floor} (${node.name}).`;
      floorChanges.push({ from: prevNode.floor, to: node.floor, mode });
    }

    steps.push({
      stepNumber: i + 1,
      placeId: node.id,
      name: node.name,
      floor: node.floor,
      landmark: node.landmark[language] || node.landmark.en,
      instruction,
      distanceMeters: edge.distance,
      usesStairs: edge.usesStairs,
    });
  }

  // Walking speed approx 0.8 to 1.0 m/s for hospital patients
  const walkMinutes = Math.max(1, Math.round(totalDistance / 45));

  return {
    start,
    end,
    totalDistanceMeters: totalDistance,
    estimatedWalkMinutes: walkMinutes,
    avoidStairsUsed: avoidStairs,
    floorChanges,
    pathNodes: path,
    steps,
  };
}

// "I'm lost" feature: Find the closest Help Desk or Nurses' Station
export function resolveLost({ currentPlaceId, currentFloor = 0, destinationPlaceId, language = "en" }) {
  const startId = currentPlaceId || (currentFloor === 1 ? "waiting_hall_a_1" : currentFloor === 2 ? "nurses_station_2" : "help_desk_0");
  const helpDesks = PLACES.filter((p) => p.isHelpDesk);

  // Find nearest help desk using shortest path
  let nearestRoute = null;
  let nearestHelpDesk = null;

  for (const hd of helpDesks) {
    try {
      const route = findShortestPath(startId, hd.id, { avoidStairs: true, language });
      if (!nearestRoute || route.totalDistanceMeters < nearestRoute.totalDistanceMeters) {
        nearestRoute = route;
        nearestHelpDesk = hd;
      }
    } catch {
      // Continue searching
    }
  }

  const destination = destinationPlaceId ? placesById.get(destinationPlaceId) : null;

  // Generate "Show to Staff" card with big text and bilingual destination
  const staffCard = {
    title: "PATIENT ASSISTANCE CARD",
    destinationNameEn: destination ? destination.name : "Help Desk / Enquiry",
    destinationFloor: destination ? destination.floor : nearestHelpDesk?.floor ?? 0,
    landmark: destination ? destination.landmark[language] || destination.landmark.en : nearestHelpDesk?.landmark[language],
    helpDeskName: nearestHelpDesk?.name || "Ground Floor Help Desk",
    instructions: {
      en: "Please show this screen to any doctor, nurse, or hospital staff member.",
      hi: "कृपया यह स्क्रीन किसी भी डॉक्टर, नर्स या अस्पताल कर्मचारी को दिखाएं।",
      ta: "தயவுசெய்து இந்தத் திரையை மருத்துவர் அல்லது செவிலியரிடம் காட்டவும்.",
    },
  };

  return {
    nearestHelpDesk,
    routeToHelpDesk: nearestRoute,
    staffCard,
  };
}

// Landmark QR Checkpoints
export function getCheckpoints() {
  return CHECKPOINTS;
}

export function routeFromCheckpoint(checkpointId, { to, departmentCode, room, avoidStairs = false, language = "en" }) {
  const cp = CHECKPOINTS.find((c) => c.id === checkpointId);
  if (!cp) throw ApiError.badRequest(`Unknown checkpoint: ${checkpointId}`);

  let destinationId = to;
  if (!destinationId && (room || departmentCode)) {
    const found = findPlaceByRoomOrDept(room, departmentCode);
    if (found) destinationId = found.id;
  }

  if (!destinationId) {
    throw ApiError.badRequest("Destination place ('to', 'room', or 'departmentCode') is required");
  }

  const route = findShortestPath(cp.placeId, destinationId, { avoidStairs, language });
  return {
    scannedCheckpoint: cp,
    ...route,
  };
}
