import { useEffect, useState } from 'react'

/** Captures the browser's install prompt so the UI can offer an "Install app" button. */
export function useInstallPrompt() {
  const [event, setEvent] = useState(null)

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      setEvent(e)
    }
    const onInstalled = () => setEvent(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = async () => {
    if (!event) return
    event.prompt()
    await event.userChoice
    setEvent(null)
  }

  return { canInstall: Boolean(event), install }
}
