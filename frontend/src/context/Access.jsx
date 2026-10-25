import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const KEY = 'qm-access'
// textSize: 0 normal, 1 large, 2 largest. assisted = "Someone is helping me".
const DEFAULTS = { textSize: 0, highContrast: false, readAloud: false, avoidStairs: false, assisted: false }
const AccessContext = createContext(null)

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}')
    // Older versions stored a single "largeText" switch.
    if (saved.textSize === undefined && saved.largeText) saved.textSize = 1
    return { ...DEFAULTS, ...saved }
  } catch {
    return DEFAULTS
  }
}

// Display and navigation preferences (no personal data). Applied to <html> so CSS can react.
export function AccessProvider({ children }) {
  const [prefs, setPrefs] = useState(load)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.text = String(prefs.textSize)
    root.dataset.large = String(prefs.textSize > 0)
    root.dataset.contrast = prefs.highContrast ? 'high' : 'normal'
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs))
    } catch {
      /* storage unavailable */
    }
  }, [prefs])

  const setPref = useCallback((name, value) => {
    setPrefs((p) => {
      if (name === 'textSize') return { ...p, textSize: Math.max(0, Math.min(2, Number(value) || 0)) }
      if (name === 'largeText') return { ...p, textSize: value ? Math.max(1, p.textSize) : 0 }
      if (name === 'assisted' && value) {
        // Assisted mode: biggest text, everything read aloud, and routes without stairs.
        return { ...p, assisted: true, textSize: 2, readAloud: true, avoidStairs: true }
      }
      return { ...p, [name]: Boolean(value) }
    })
  }, [])

  const value = useMemo(() => ({ prefs: { ...prefs, largeText: prefs.textSize > 0 }, setPref }), [prefs, setPref])
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
}

export const useAccess = () => useContext(AccessContext)
