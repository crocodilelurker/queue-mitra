// Vector icon (name from components/common/Icons.jsx) for each kind of place on the floor plan.
const BY_CATEGORY = {
  entrance: 'door',
  counter: 'receipt',
  helpdesk: 'help',
  facility: 'pin',
  emergency: 'ambulance',
  pharmacy: 'pill',
  lab: 'flask',
  vertical_transport: 'lift',
  waiting_area: 'armchair',
  opd_room: 'stethoscope',
  ward: 'bed',
}

const BY_ID = {
  drinking_water_0: 'droplet',
  toilets_0: 'users',
  toilets_1: 'users',
  wheelchair_point_0: 'accessibility',
  ramp_0: 'accessibility',
  stairs_0: 'stairs',
  stairs_1: 'stairs',
  stairs_2: 'stairs',
}

// OPD rooms use their department's icon (ear for ENT, eye for Eyes, ...).
const DEPARTMENT_ICON = { MED: 'med', CHD: 'child', WOM: 'woman', ORT: 'bone', ENT: 'ear', EYE: 'eye', SKN: 'skin' }

export const placeIconName = (place) =>
  BY_ID[place.id] || (place.category === 'opd_room' && DEPARTMENT_ICON[place.departmentCode]) || BY_CATEGORY[place.category] || 'pin'

// Find the OPD room place on the map for a slip's room name (e.g. "Room 6") and/or department code.
export function findRoomPlace(places, room, deptCode) {
  if (room) {
    const exact = places.find((p) => p.category === 'opd_room' && p.name.startsWith(`${room} (`))
    if (exact) return exact
  }
  return deptCode ? places.find((p) => p.departmentCode === deptCode.toUpperCase()) || null : null
}
