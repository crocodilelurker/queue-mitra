import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client.js'
import { useSocket } from '../api/socket.js'

const fromTicket = (t) => ({ id: t.id, tokenNumber: t.tokenNumber, firstName: t.patient.firstName, department: t.department.name, raisedAt: t.urgent.raisedAt, isEmergency: t.isEmergency, complaint: t.complaint })

/** Unseen "I need urgent help" flags for this hospital: loaded once, then kept live over the socket. */
export function useUrgent(enabled) {
  const [flags, setFlags] = useState([])

  useEffect(() => {
    if (!enabled) return
    api.urgentList().then((d) => setFlags(d.flags.map(fromTicket))).catch(() => {})
  }, [enabled])

  useSocket({
    on: {
      'urgent:raised': (a) => setFlags((prev) => (prev.some((x) => x.id === a.id) ? prev : [...prev, a])),
      'urgent:seen': (s) => setFlags((prev) => prev.filter((x) => x.id !== s.id)),
    },
  })

  const markSeen = useCallback(async (id) => {
    await api.urgentSeen(id)
    setFlags((prev) => prev.filter((x) => x.id !== id))
  }, [])

  return { flags, markSeen }
}
