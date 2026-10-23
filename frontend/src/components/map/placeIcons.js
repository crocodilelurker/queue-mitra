const BY_CATEGORY = {
  entrance: '🚪',
  counter: '🧾',
  helpdesk: '❓',
  facility: '📍',
  emergency: '🚑',
  pharmacy: '💊',
  lab: '🧪',
  vertical_transport: '🛗',
  waiting_area: '🪑',
  opd_room: '🩺',
  ward: '🛏️',
}

const BY_ID = { drinking_water_0: '💧', toilets_0: '🚻', toilets_1: '🚻', wheelchair_point_0: '♿', ramp_0: '♿', stairs_0: '🪜', stairs_1: '🪜', stairs_2: '🪜' }

export const placeIcon = (place) => BY_ID[place.id] || BY_CATEGORY[place.category] || '📍'

// Find the OPD room place on the map for a slip's room name (e.g. "Room 6") and/or department code.
export function findRoomPlace(places, room, deptCode) {
  if (room) {
    const exact = places.find((p) => p.category === 'opd_room' && p.name.startsWith(`${room} (`))
    if (exact) return exact
  }
  return deptCode ? places.find((p) => p.departmentCode === deptCode.toUpperCase()) || null : null
}
