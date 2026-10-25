import { departmentForRoom, departmentIcon } from '../../api/departments.js'

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

const roomOf = (place) => `Room ${String(place.id).replace('room_', '')}`

// OPD rooms use the icon of the department working there today (ear for ENT, eye for Eyes, ...).
export const placeIconName = (place) => {
  if (!place) return 'pin'
  if (BY_ID[place.id]) return BY_ID[place.id]
  if (place.category === 'opd_room') {
    const dept = departmentForRoom(roomOf(place))
    return dept ? departmentIcon(dept) : 'door'
  }
  return BY_CATEGORY[place.category] || 'pin'
}

// The map place for a slip's room ("Room 6") or, failing that, the department's first room.
export function findRoomPlace(places, room, deptCode, departments = []) {
  const n = String(room || '').match(/\d+/)?.[0]
  if (n) {
    const byId = places.find((p) => p.id === `room_${n}`)
    if (byId) return byId
  }
  const dept = departments.find((d) => d.code === String(deptCode || '').toUpperCase())
  const deptRoom = dept?.rooms?.[0]?.match(/\d+/)?.[0]
  return deptRoom ? places.find((p) => p.id === `room_${deptRoom}`) || null : null
}
