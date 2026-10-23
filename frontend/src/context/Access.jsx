import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const KEY = 'qm-access'
const DEFAULTS = { largeText: false, highContrast: false, readAloud: false, avoidStairs: false }
const AccessContext = createContext(null)

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return DEFAULTS
  }
}

// Display and navigation preferences (no personal data). Applied to <html> so CSS can react.
export function AccessProvider({ children }) {
  const [prefs, setPrefs] = useState(load)

  useEffect(() => {
    document.documentElement.dataset.large = String(prefs.largeText)
    document.documentElement.dataset.contrast = prefs.highContrast ? 'high' : 'normal'
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs))
    } catch {
      /* storage unavailable */
    }
  }, [prefs])

  const setPref = useCallback((name, value) => setPrefs((p) => ({ ...p, [name]: Boolean(value) })), [])
  const value = useMemo(() => ({ prefs, setPref }), [prefs, setPref])
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
}

export const useAccess = () => useContext(AccessContext)
