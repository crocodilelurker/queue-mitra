import { useEffect, useState } from 'react'

// The browser fires beforeinstallprompt once, early. Capture it at load so Settings can offer it later.
let deferred = null
const listeners = new Set()
const notify = () => listeners.forEach((fn) => fn(deferred))

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
}

/** "Install app": only available after the browser has offered it (beforeinstallprompt). */
export function useInstallPrompt() {
  const [event, setEvent] = useState(deferred)

  useEffect(() => {
    listeners.add(setEvent)
    return () => listeners.delete(setEvent)
  }, [])

  const install = async () => {
    if (!event) return
    event.prompt()
    await event.userChoice.catch(() => {})
    deferred = null
    notify()
  }

  return { canInstall: Boolean(event), install }
}
