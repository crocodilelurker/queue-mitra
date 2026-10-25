import { useEffect, useState } from 'react'
import { api } from './client.js'

// Departments are created live by the hospital admin, so any code can appear. The catalog ones are shown
// first in the brief's order; any other department follows in alphabetical order.
const CATALOG_ORDER = ['MED', 'CHD', 'WOM', 'ORT', 'ENT', 'EYE', 'SKN']

let cache = null // { list, byCode, byRoom }
let inflight = null
const listeners = new Set()

const rank = (code) => (CATALOG_ORDER.includes(code) ? CATALOG_ORDER.indexOf(code) : CATALOG_ORDER.length)
const sortDepartments = (list) => [...list].sort((a, b) => rank(a.code) - rank(b.code) || String(a.name).localeCompare(String(b.name)))

function build(departments) {
  const list = sortDepartments((departments || []).filter((d) => d.isActive !== false))
  const byRoom = {}
  for (const d of list) for (const room of d.rooms || []) byRoom[String(room).toLowerCase()] ||= d
  return { list, byCode: Object.fromEntries(list.map((d) => [d.code, d])), byRoom }
}

/** Fetches the live list again (shared by every screen that is open). */
export function refreshDepartments() {
  inflight ||= api
    .departments()
    .then(({ departments }) => {
      cache = build(departments)
      listeners.forEach((fn) => fn(cache))
      return cache
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

/** Synchronous lookup used for localized names (null until the list has loaded). */
export const lookupDepartment = (code) => cache?.byCode[code] ?? null

/** The department working in a room today ("Room 3"), if any. */
export const departmentForRoom = (room) => (room ? cache?.byRoom[String(room).toLowerCase()] ?? null : null)

/**
 * Live departments. Shows the last known list at once and refreshes it in the background on every mount,
 * so a department the admin has just added appears on the next screen.
 */
export function useDepartments() {
  const [state, setState] = useState(() => ({ ...(cache || { list: [], byCode: {}, byRoom: {} }), loading: !cache, error: null }))

  useEffect(() => {
    let alive = true
    const onChange = (c) => alive && setState({ ...c, loading: false, error: null })
    listeners.add(onChange)
    refreshDepartments().catch((error) => alive && setState((s) => ({ ...s, loading: false, error })))
    return () => {
      alive = false
      listeners.delete(onChange)
    }
  }, [])

  return state
}

// Icon (components/common/Icons.jsx) for a department. Custom departments get a generic doctor icon.
const ICON_BY_CODE = { MED: 'med', CHD: 'child', WOM: 'woman', ORT: 'bone', ENT: 'ear', EYE: 'eye', SKN: 'skin' }
// Catalog icon keys from the backend, mapped to names in Icons.jsx.
const ICON_BY_KEY = { stethoscope: 'med', baby: 'child', pregnant: 'woman', bone: 'bone', ear: 'ear', eye: 'eye', skin: 'skin' }

export function departmentIcon(dept) {
  if (!dept) return 'doctor'
  if (dept.icon && ICON_BY_KEY[dept.icon]) return ICON_BY_KEY[dept.icon]
  if (ICON_BY_CODE[dept.code]) return ICON_BY_CODE[dept.code]
  return 'doctor'
}
