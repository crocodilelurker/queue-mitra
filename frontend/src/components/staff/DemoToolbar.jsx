import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import { Icon } from '../common/Icons.jsx'

/** Floating demo dock: add sample patients, run the queue at 10x speed, reset. Collapsed by default. */
export default function DemoToolbar() {
  const [open, setOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    api.simulationStatus().then((s) => setRunning(s.isRunning)).catch(() => {})
  }, [open])

  const run = async (label, fn) => {
    setBusy(true)
    setMessage('')
    try {
      const res = await fn()
      setMessage(res.message || label)
      if ('isRunning' in res) setRunning(res.isRunning)
    } catch (err) {
      setMessage(err.status === 0 ? 'Cannot reach the server.' : err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <aside className="demo" aria-label="Demo controls">
      {open && (
        <div className="demo__panel box">
          <button type="button" className="btn btn--sm" disabled={busy} onClick={() => run('Seeded patients', api.seedPatients)}>
            <Icon name="users" size={16} /> Add sample patients
          </button>
          {running ? (
            <button type="button" className="btn btn--sm" disabled={busy} onClick={() => run('Stopped', api.stopSimulation)}>
              <Icon name="stop" size={16} /> Stop simulation
            </button>
          ) : (
            <button type="button" className="btn btn--sm" disabled={busy} onClick={() => run('Started', api.startSimulation)}>
              <Icon name="play" size={16} /> 10x auto-simulate
            </button>
          )}
          <button
            type="button"
            className="btn btn--sm btn--danger"
            disabled={busy}
            onClick={() => window.confirm('Delete all tickets and reset the queues?') && run('Reset done', api.resetDemo)}
          >
            <Icon name="refresh" size={16} /> Reset all
          </button>
          {message && <p className="field__hint" role="status">{message}</p>}
        </div>
      )}
      <button type="button" className="btn btn--sm demo__toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name="sparkles" size={16} /> Demo
      </button>
    </aside>
  )
}
