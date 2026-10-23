import { useEffect, useState } from 'react'
import { api } from './client.js'

// Display order used by the patient screens (matches the brief's picture-card list).
const ORDER = ['MED', 'CHD', 'WOM', 'ORT', 'ENT', 'EYE', 'SKN']

let cache = null // { list, byCode }
let inflight = null

const rank = (code) => (ORDER.includes(code) ? ORDER.indexOf(code) : ORDER.length)
const sortDepartments = (list) => [...list].sort((a, b) => rank(a.code) - rank(b.code))

function load() {
  inflight ||= api
    .departments()
    .then(({ departments }) => {
      const list = sortDepartments(departments)
      cache = { list, byCode: Object.fromEntries(list.map((d) => [d.code, d])) }
      return cache
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

/** Synchronous lookup used for localized names (null until the list has loaded). */
export const lookupDepartment = (code) => cache?.byCode[code] ?? null

/** Departments from the backend (cached for the session). */
export function useDepartments() {
  const [state, setState] = useState({ ...(cache || { list: [], byCode: {} }), loading: !cache, error: null })

  useEffect(() => {
    if (cache) return undefined
    let alive = true
    load()
      .then((c) => alive && setState({ ...c, loading: false, error: null }))
      .catch((error) => alive && setState((s) => ({ ...s, loading: false, error })))
    return () => {
      alive = false
    }
  }, [])

  return state
}
