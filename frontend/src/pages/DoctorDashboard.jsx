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
import { Icon } from '../components/common/Icons.jsx'

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
      <section className="card panel doctor-status-card">
        <div className="doctor-status-card__header">
          <div className="doctor-status-card__profile">
            <span className="doctor-avatar">
              <Icon name="doctor" size={24} color="#0f766e" />
            </span>
            <div>
              <h2 className="panel__title">{user.name}</h2>
              <span className="field__hint">{user.room} · {queue.department.name}</span>
            </div>
          </div>
          <span className={`status-pill status-pill--${me?.state || 'available'}`}>
            {me ? me.state.replace('_', ' ') : 'Available'}
          </span>
        </div>

        <div className="form__actions mt-2">
          <button type="button" className="btn btn--sm" aria-pressed={me?.state === 'available'} disabled={busy} onClick={() => setStatus({ state: 'available' })}>
            <Icon name="check" size={14} /> Available
          </button>
          <button
            type="button"
            className="btn btn--sm"
            aria-pressed={me?.state === 'on_break'}
            disabled={busy}
            onClick={() => setStatus({ state: 'on_break', until: new Date(Date.now() + 15 * 60000).toISOString() })}
          >
            <Icon name="clock" size={14} /> Break (15m)
          </button>
          <button type="button" className="btn btn--sm" aria-pressed={me?.state === 'running_late'} disabled={busy} onClick={() => setStatus({ state: 'running_late', delayMinutes: 15 })}>
            <Icon name="alert" size={14} /> Late (15m)
          </button>
        </div>
      </section>

      <button type="button" className="btn btn--primary btn--lg btn--block" disabled={busy} onClick={() => act(() => api.callNext())}>
        <Icon name="speaker" size={20} />
        <span>Call Next Patient</span>
      </button>
      <ErrorNote error={actionError} />

      <section className="card panel current-patient-card" aria-label="Current patient">
        <h2 className="panel__title">Current Consultation</h2>
        {current ? (
          <div className="current-patient-box">
            <div className="current-patient-box__header">
              <span className="current-token-badge">{current.tokenNumber}</span>
              <ConsultTimer since={current.calledAt} />
            </div>

            <p className="current-patient-name">
              <strong>{current.patient.firstName}</strong> ({current.patient.age}y, {current.patient.gender})
            </p>

            {current.isEmergency && (
              <div className="emergency-indicator-bar">
                <span className="badge badge--bad">EMERGENCY CASE</span>
                {current.complaint && <span className="emergency-complaint">“{current.complaint}”</span>}
              </div>
            )}

            <div className="form__actions mt-3">
              <button type="button" className="btn btn--sm btn--primary" disabled={busy} onClick={() => act(() => api.complete(current.id))}>
                <Icon name="check" size={15} /> Complete
              </button>
              <button type="button" className="btn btn--sm btn--outline" disabled={busy} onClick={() => act(() => api.noShow(current.id))}>
                <Icon name="close" size={15} /> No-Show
              </button>
              <button type="button" className="btn btn--sm btn--outline" disabled={busy} onClick={() => act(() => api.requeue(current.id))}>
                <Icon name="clock" size={15} /> Requeue
              </button>
              <button type="button" className="btn btn--sm btn--outline" disabled={busy} onClick={() => setTransferOpen(true)}>
                <Icon name="arrow-right" size={15} /> Transfer
              </button>
            </div>
          </div>
        ) : (
          <p className="field__hint py-3 text-center">No active patient in consultation. Click "Call Next Patient" to start.</p>
        )}
      </section>

      <QueueSummary queue={queue} />

      <section className="card panel" aria-label="Waiting list">
        <h2 className="panel__title">Waiting Queue ({queue.waitingCount})</h2>
        {waiting.length === 0 ? (
          <p className="field__hint">No patients waiting in queue.</p>
        ) : (
          <ol className="wait-list">
            {waiting.map((p) => (
              <li key={p.id} className="wait-list__item">
                <span className="wait-list__token">{p.tokenNumber}</span>
                <span className="wait-list__name">{p.patient.firstName}, {p.patient.age}</span>
                {p.isEmergency && <span className="badge badge--bad">EMERGENCY</span>}
                {!p.isEmergency && p.urgent?.raised && !p.urgent.seenAt && <span className="badge badge--bad">URGENT</span>}
                {p.complaint && <span className="field__hint"> · “{p.complaint}”</span>}
                <span className="field__hint ml-auto">{minutesSince(p.createdAt)}m wait</span>
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
                className="btn btn--outline"
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
      <section className="card panel">
        <p className="field__hint mb-2">Staff desk for monitoring department queues and assisted patient walk-in registrations.</p>
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
      <div className="staff-bar card">
        <div className="staff-bar__title-box">
          <Icon name="doctor" size={24} color="#0f766e" />
          <h1 className="hero hero--sm">{user.role === 'doctor' ? 'Doctor Dashboard' : 'Staff Command Desk'}</h1>
        </div>
        <div className="form__actions">
          <Link className="btn btn--sm btn--outline" to="/analytics">
            <Icon name="chart" size={15} /> Analytics
          </Link>
          <Link className="btn btn--sm btn--outline" to="/board">
            <Icon name="tv" size={15} /> TV Board
          </Link>
          <button type="button" className="btn btn--sm btn--outline" onClick={signOut}>
            <Icon name="close" size={15} /> Log Out
          </button>
        </div>
      </div>
      <div className="staff-grid">{user.role === 'doctor' ? <DoctorView user={user} /> : <StaffView />}</div>
      <DemoToolbar />
    </Layout>
  )
}
