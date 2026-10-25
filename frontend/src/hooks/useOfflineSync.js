import { useEffect } from 'react'
import { syncOfflineRegistrations } from '../utils/patientStore.js'

/** Sends registrations made offline as soon as the phone is back online. */
export function useOfflineSync() {
  useEffect(() => {
    syncOfflineRegistrations()
    const onOnline = () => syncOfflineRegistrations()
    window.addEventListener('online', onOnline)
    const timer = setInterval(onOnline, 30000)
    return () => {
      window.removeEventListener('online', onOnline)
      clearInterval(timer)
    }
  }, [])
}
