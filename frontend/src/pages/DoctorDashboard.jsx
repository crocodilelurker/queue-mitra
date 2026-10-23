import { useEffect, useState } from 'react'
import { api } from '../api/client.js'
import { useDepartments } from '../api/departments.js'
import { useSocket } from '../api/socket.js'
import Modal from '../components/common/Modal.jsx'
import { ErrorNote, Loading } from '../components/common/Status.jsx'
import Layout from '../components/Layout.jsx'
import CounterRegistration from '../components/staff/CounterRegistration.jsx'
import DemoToolbar from '../components/staff/DemoToolbar.jsx'
import QueueSummary from '../components/staff/QueueSummary.jsx'
import StaffLogin from '../components/staff/StaffLogin.jsx'
import UrgentBanner from '../components/staff/UrgentBanner.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { useStaffSession } from '../hooks/useStaffSession.js'
import { useUrgent } from '../hooks/useUrgent.js'
import { Link } from '../router.jsx'

const minutesSince = (value) => Math.max(0, Math.floor((Date.now() - new Date(value)) / 60000))

function ConsultTimer({ since }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(since)) / 1000))
  return <span className="timer">{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</span>
}

function DoctorView({ user }) {
  const { list } = useDepartments()
  const { data, error, loading, reload } = useAsync(() => api.dashboard(), [])
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [transferOpen, setTransferOpen] = useState(false)

  const deptCode = data?.queue.department.code
  useSocket({ on: { 'queue:updated': (snap) => snap.department.code === deptCode && reload(true) } })

  const act = async (fn) => {
    setBusy(true)
    setActionError(null)
    try {
      await fn()
      await reload(true)
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Loading />
  if (error) return <ErrorNote error={error} onRetry={reload} />

  const { queue, current, waiting } = data
  const me = queue.doctors.find((d) => d.name === user.name)
  const setStatus = (body) => act(() => api.setStatus(body))

  return (
    <>
      <section className="box panel">
        <h2 className="form__title">
          {user.name} · {user.room} · {queue.department.name}
        </h2>
        <p className="field__hint">Status: {me ? me.state.replace('_', ' ') : '—'}</p>
        <div className="form__actions">
          <button type="button" className="btn btn--sm" aria-pressed={me?.state === 'available'} disabled={busy} onClick={() => setStatus({ state: 'available' })}>
            <span aria-hidden="true">✅</span> Available
          </button>
          <button
            type="button"
            className="btn btn--sm"
            aria-pressed={me?.state === 'on_break'}
            disabled={busy}
            onClick={() => setStatus({ state: 'on_break', until: new Date(Date.now() + 15 * 60000).toISOString() })}
          >
            <span aria-hidden="true">☕</span> On break (15 min)
          </button>
          <button type="button" className="btn btn--sm" aria-pressed={me?.state === 'running_late'} disabled={busy} onClick={() => setStatus({ state: 'running_late', delayMinutes: 15 })}>
            <span aria-hidden="true">⏰</span> Running late (15 min)
          </button>
        </div>
      </section>

      <button type="button" className="btn btn--primary btn--block" disabled={busy} onClick={() => act(() => api.callNext())}>
        <span aria-hidden="true">🔔</span> Call next patient
      </button>
      <ErrorNote error={actionError} />

      <section className="box panel" aria-label="Current patient">
        <h2 className="form__title">Current patient</h2>
        {current ? (
          <>
            <p className="turn-head__token">{current.tokenNumber}</p>
            <p>
              {current.patient.firstName}, {current.patient.age} · {current.patient.gender} · <ConsultTimer since={current.calledAt} />
              {current.urgent?.raised && !current.urgent.seenAt && ' · 🚨 urgent'}
            </p>
            <div className="form__actions">
              <button type="button" className="btn btn--sm" disabled={busy} onClick={() => act(() => api.complete(current.id))}>
                <span aria-hidden="true">✔</span> Complete
              </button>
              <button type="button" className="btn btn--sm" disabled={busy} onClick={() => act(() => api.noShow(current.id))}>
                <span aria-hidden="true">❌</span> No-show
              </button>
              <button type="button" className="btn btn--sm" disabled={busy} onClick={() => act(() => api.requeue(current.id))}>
                <span aria-hidden="true">⏭️</span> Requeue to end
              </button>
              <button type="button" className="btn btn--sm" disabled={busy} onClick={() => setTransferOpen(true)}>
                <span aria-hidden="true">🔄</span> Transfer
              </button>
            </div>
          </>
        ) : (
          <p className="field__hint">No patient in the room. Press “Call next patient”.</p>
        )}
      </section>

      <QueueSummary queue={queue} />

      <section className="box panel" aria-label="Waiting list">
        <h2 className="form__title">Waiting ({queue.waitingCount})</h2>
        {waiting.length === 0 ? (
          <p className="field__hint">Nobody is waiting.</p>
        ) : (
          <ol className="wait-list">
            {waiting.map((p) => (
              <li key={p.id}>
                <b>{p.tokenNumber}</b> {p.patient.firstName}, {p.patient.age}
                {p.urgent?.raised && !p.urgent.seenAt && <span className="badge badge--bad"> urgent</span>}
                <span className="field__hint"> · waiting {minutesSince(p.createdAt)} min</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="Transfer to another department">
        <div className="form">
          {list
            .filter((d) => d.code !== deptCode)
            .map((d) => (
              <button
                key={d.code}
                type="button"
                className="btn"
                disabled={busy}
                onClick={() => {
                  setTransferOpen(false)
                  act(() => api.transfer(current.id, d.code))
                }}
              >
                {d.name}
              </button>
            ))}
        </div>
      </Modal>
    </>
  )
}

function StaffView() {
  const { list } = useDepartments()
  const [code, setCode] = useState('')
  useEffect(() => {
    if (!code && list.length) setCode(list[0].code)
  }, [list, code])
  const { data: queue, error, loading, reload } = useAsync(() => (code ? api.departmentQueue(code) : Promise.resolve(null)), [code])
  useSocket({ on: { 'queue:updated': (snap) => snap.department.code === code && reload(true) } })

  return (
    <>
      <section className="box panel">
        <p className="field__hint">Staff accounts can watch every queue and register walk-ins. Doctors call patients from their own login.</p>
        <label className="field__label" htmlFor="staff-dept">
          Department
        </label>
        <select id="staff-dept" className="field__control" value={code} onChange={(e) => setCode(e.target.value)}>
          {list.map((d) => (
            <option key={d.code} value={d.code}>
              {d.name}
            </option>
          ))}
        </select>
      </section>
      {loading && <Loading />}
      <ErrorNote error={error} onRetry={reload} />
      {queue && <QueueSummary queue={queue} />}
      <CounterRegistration />
    </>
  )
}

export default function DoctorDashboard() {
  const { user, loading, signIn, signOut } = useStaffSession()
  const urgent = useUrgent(Boolean(user))

  if (loading) return <Layout><Loading /></Layout>
  if (!user) {
    return (
      <Layout>
        <StaffLogin onSignIn={signIn} />
      </Layout>
    )
  }

  return (
    <Layout wide>
      <UrgentBanner flags={urgent.flags} onSeen={urgent.markSeen} />
      <div className="staff-bar">
        <h1 className="hero hero--sm">{user.role === 'doctor' ? 'Doctor dashboard' : 'Staff desk'}</h1>
        <div className="form__actions">
          <Link className="btn btn--sm" to="/analytics">
            <span aria-hidden="true">📊</span> Analytics
          </Link>
          <Link className="btn btn--sm" to="/board">
            <span aria-hidden="true">📺</span> TV board
          </Link>
          <button type="button" className="btn btn--sm" onClick={signOut}>
            <span aria-hidden="true">🚪</span> Log out
          </button>
        </div>
      </div>
      <div className="staff-grid">{user.role === 'doctor' ? <DoctorView user={user} /> : <StaffView />}</div>
      <DemoToolbar />
    </Layout>
  )
}
