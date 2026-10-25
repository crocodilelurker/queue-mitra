// Schematic floor plans drawn on the patient's phone: one long corridor up the middle of each floor, with
// rooms on both sides. Every door opens onto the corridor, so a route is always drawn along it.
// The lift and stairs sit in the same place on every floor. Positions are in SVG units (360 wide).
// Places come from the backend graph (GET /api/navigation/map); routing stays on the server (Dijkstra).

export const PLAN_W = 360
export const SPINE_X = 180
const MARGIN = 8
const CORRIDOR_L = 136
const CORRIDOR_R = 224
const TOP = 16
const SLOT = 72 // slot pitch; rooms are SLOT - 8 tall
const SLOTS = 8
const BOTTOM_ROW_Y = TOP + SLOTS * SLOT + 8
const BOTTOM_ROW_H = 64

// [placeId, side, firstSlot, slotCount]  side: L(eft) / R(ight) of the corridor; slot 0 is the far end.
const LAYOUT = {
  0: {
    rooms: [
      ['pharmacy_0', 'L', 0, 2],
      ['reg_counters_0', 'L', 2, 2],
      ['help_desk_0', 'L', 4, 1],
      ['emergency_casualty_0', 'L', 5, 3],
      ['laboratory_0', 'R', 0, 2],
      ['xray_0', 'R', 2, 1],
      ['drinking_water_0', 'R', 3, 1],
      ['toilets_0', 'R', 4, 1],
      ['lift_0', 'R', 5, 2],
      ['stairs_0', 'R', 7, 1],
    ],
    // The main gate is at the near end of the corridor, with wheelchairs on its left and the ramp on its right.
    bottom: [
      ['wheelchair_point_0', 'L'],
      ['main_entrance_0', 'C'],
      ['ramp_0', 'R'],
    ],
  },
  1: {
    rooms: [
      ['room_4', 'L', 0, 1],
      ['room_3', 'L', 1, 1],
      ['room_2', 'L', 2, 1],
      ['room_1', 'L', 3, 1],
      ['waiting_hall_a_1', 'L', 4, 3],
      ['toilets_1', 'L', 7, 1],
      ['room_8', 'R', 0, 1],
      ['room_7', 'R', 1, 1],
      ['room_6', 'R', 2, 1],
      ['room_5', 'R', 3, 1],
      ['help_desk_1', 'R', 4, 1],
      ['lift_1', 'R', 5, 2],
      ['stairs_1', 'R', 7, 1],
    ],
  },
  2: {
    rooms: [
      ['ward_4', 'L', 0, 3],
      ['ward_6', 'L', 3, 3],
      ['ward_5', 'R', 0, 3],
      ['nurses_station_2', 'R', 3, 2],
      ['lift_2', 'R', 5, 2],
      ['stairs_2', 'R', 7, 1],
    ],
  },
}

function sideRect(side, slot, span) {
  const y = TOP + slot * SLOT
  const h = span * SLOT - 8
  return side === 'L' ? { x: MARGIN, y, w: CORRIDOR_L - 4 - MARGIN, h } : { x: CORRIDOR_R + 4, y, w: PLAN_W - MARGIN - CORRIDOR_R - 4, h }
}

function withAnchors(id, side, rect) {
  const cy = rect.y + rect.h / 2
  const cx = rect.x + rect.w / 2
  // door: where the room meets the corridor; spine: the corridor's centre line opposite the door.
  const door = side === 'L' ? [rect.x + rect.w, cy] : side === 'R' ? [rect.x, cy] : [cx, rect.y]
  const spine = side === 'C' ? [SPINE_X, rect.y] : [SPINE_X, cy]
  return { id, side, ...rect, center: [cx, cy], door, spine }
}

/** { width, height, corridor, rooms: { [placeId]: { x, y, w, h, center, door, spine } } } for one floor. */
export function floorPlan(floor) {
  const def = LAYOUT[floor]
  if (!def) return null
  const rooms = {}
  for (const [id, side, slot, span] of def.rooms) rooms[id] = withAnchors(id, side, sideRect(side, slot, span))
  let height = TOP + SLOTS * SLOT + 8
  if (def.bottom) {
    for (const [id, side] of def.bottom) {
      const rect =
        side === 'C'
          ? { x: CORRIDOR_L, y: BOTTOM_ROW_Y, w: CORRIDOR_R - CORRIDOR_L, h: BOTTOM_ROW_H }
          : side === 'L'
            ? { x: MARGIN, y: BOTTOM_ROW_Y, w: CORRIDOR_L - 4 - MARGIN, h: BOTTOM_ROW_H }
            : { x: CORRIDOR_R + 4, y: BOTTOM_ROW_Y, w: PLAN_W - MARGIN - CORRIDOR_R - 4, h: BOTTOM_ROW_H }
      const room = withAnchors(id, side, rect)
      // Side blocks in the entrance row open onto the entrance hall.
      if (side !== 'C') room.spine = [SPINE_X, rect.y + rect.h / 2]
      rooms[id] = room
    }
    height = BOTTOM_ROW_Y + BOTTOM_ROW_H + 8
  }
  const corridor = { x: CORRIDOR_L, y: 8, w: CORRIDOR_R - CORRIDOR_L, h: (def.bottom ? BOTTOM_ROW_Y : height - 8) - 8 }
  return { width: PLAN_W, height, corridor, rooms }
}

/** Polyline for the part of a route on one floor: out of the first door, along the corridor, to the last door. */
export function routeLine(plan, nodes) {
  const placed = nodes.map((n) => plan.rooms[n.id]).filter(Boolean)
  if (placed.length === 0) return []
  const a = placed[0]
  const z = placed[placed.length - 1]
  if (placed.length === 1) return [a.door]
  // From door to door: the line never crosses a room's label.
  const pts = [a.door, a.spine, z.spine, z.door]
  // Drop repeated points so the line has no zero-length joints.
  return pts.filter((p, i) => i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1])
}
