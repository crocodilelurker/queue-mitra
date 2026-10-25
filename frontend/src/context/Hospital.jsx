import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '../api/client.js'
import { setHospitalCode } from '../config.js'

const HospitalContext = createContext(null)

// Last known setup status, so a reload on a weak connection can still render the patient screens.
const CACHE_KEY = 'qm-hospital'

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY)) || null
  } catch {
    return null
  }
}

/**
 * Loads GET /api/setup/status once on start.
 * configured=false means the database is empty: the app sends everyone to /setup.
 */
export function HospitalProvider({ children }) {
  const [state, setState] = useState(() => {
    const cached = readCache()
    if (cached?.hospital) setHospitalCode(cached.hospital.code)
    return { loading: true, error: null, configured: Boolean(cached?.configured), hospital: cached?.hospital ?? null }
  })

  const refresh = useCallback(async () => {
    try {
      const status = await api.setupStatus()
      setHospitalCode(status.hospital?.code)
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ configured: status.configured, hospital: status.hospital }))
      } catch {
        /* storage unavailable */
      }
      setState({ loading: false, error: null, configured: status.configured, hospital: status.hospital ?? null, counts: status.counts })
      return status
    } catch (error) {
      setState((s) => ({ ...s, loading: false, error }))
      return null
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return <HospitalContext.Provider value={{ ...state, refresh }}>{children}</HospitalContext.Provider>
}

export const useHospital = () => useContext(HospitalContext)
