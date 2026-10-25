import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useHospital } from '../../context/Hospital.jsx'
import { Link, navigate } from '../../router.jsx'
import { Icon } from '../../components/common/Icons.jsx'
import StaffShell, { useLiveRefetch, useStaffLive } from '../../components/staff/StaffShell.jsx'
import {
  Button,
  Card,
  CrowdBadge,
  DoctorStatusChip,
  EmptyState,
  InlineError,
  PageHeader,
  Skeleton,
  SkeletonCards,
  Stat,
  aboutWait,
  deptIcon,
} from '../../components/staff/ui.jsx'
import './console.css'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function Checklist({ departments, doctors, registered }) {
  const items = [
    { done: true, title: 'Create the hospital', text: 'Done during setup.' },
    {
      done: departments > 0,
      title: 'Add your first department',
      text: 'Patients can only register once an OPD department exists.',
      action: (
        <Button size="sm" variant="primary" icon="plus" onClick={() => navigate('/admin/departments')}>
          Add department
        </Button>
      ),
    },
    {
      done: doctors > 0,
      title: 'Add doctors',
      text: 'Each doctor signs in to their room console to call patients.',
      action: (
        <Button size="sm" icon="user-plus" onClick={() => navigate('/admin/people')}>
          Add doctor
        </Button>
      ),
    },
    {
      done: registered > 0,
      title: 'Register the first patient',
      text: 'On a phone with the patient app, or at the registration counter.',
      action: (
        <Button size="sm" icon="user-plus" onClick={() => navigate('/admin/counter')} disabled={!departments}>
          Open counter
        </Button>
      ),
    },
    {
      done: false,
      optional: true,
      title: 'Put the TV board on the waiting-hall screen',
      text: 'It shows who is being seen and announces each call aloud.',
      action: (
        <a className="sx-btn sx-btn--sm" href="/board" target="_blank" rel="noreferrer">
          <Icon name="tv" size={15} /> Open TV board
        </a>
      ),
    },
  ]
  const left = items.filter((i) => !i.done && !i.optional).length
  if (!left) return null
  return (
    <Card title="Getting started" icon="sparkles" actions={<span className="sx-small sx-muted">{left} step{left > 1 ? 's' : ''} left</span>}>
      <ul className="sx-checklist">
        {items.map((i) => (
          <li key={i.title} data-done={i.done}>
            <span className="sx-checklist__mark" aria-hidden="true">
              {i.done && <Icon name="check" size={14} />}
            </span>
            <span className="sx-checklist__text">
              <strong>
                {i.title}
                <span className="sx-visually-hidden">{i.done ? ' (done)' : ' (to do)'}</span>
              </strong>
              <span>{i.text}</span>
            </span>
            {!i.done && i.action}
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function DepartmentCard({ d }) {
  const seats = d.seatingCapacity || 0
  return (
    <article className="qc-dept">
      <header className="qc-dept__head">
        <span className="qc-dept__icon" aria-hidden="true">
          <Icon name={deptIcon(d)} size={20} />
        </span>
        <div className="qc-dept__title">
          <h3>{d.name}</h3>
          <span className="sx-small sx-muted">
            {(d.rooms || []).join(', ') || 'No room'} · Floor {d.floor ?? 1}
          </span>
        </div>
        <CrowdBadge level={d.crowd} />
      </header>
      <div className="qc-dept__nums">
        <div>
          <span>Waiting</span>
          <strong>
            {d.waitingCount ?? 0}
            {seats ? <small> / {seats} seats</small> : null}
          </strong>
        </div>
        <div>
          <span>Now serving</span>
          <strong className="sx-token qc-accent">{d.nowServing?.length ? d.nowServing.map((n) => n.tokenNumber).join(', ') : '—'}</strong>
        </div>
        <div>
          <span>New patient waits</span>
          <strong>{aboutWait(d.estimatedWaitMinutes)}</strong>
        </div>
      </div>
      <footer className="qc-dept__foot">
        {d.doctors?.length ? (
          d.doctors.map((doc) => (
            <span key={doc._id || doc.name} className="sx-row" style={{ gap: 6 }}>
              <span className="sx-small">
                {doc.name} · {doc.room}
              </span>
              <DoctorStatusChip status={doc.status} />
            </span>
          ))
        ) : (
          <span className="sx-small sx-muted">
            No doctor assigned · <Link to="/admin/people">Add a doctor</Link>
          </span>
        )}
      </footer>
    </article>
  )
}

function Overview() {
  const { currentUser } = useAuth()
  const { hospital } = useHospital()
  const live = useStaffLive()
  const [admin, setAdmin] = useState(null)
  const [error, setError] = useState(null)

  const load = () =>
    api
      .adminOverview()
      .then((d) => {
        setAdmin(d)
        setError(null)
      })
      .catch(setError)
  useEffect(() => {
    load()
    document.title = `Overview · ${hospital?.name || 'Queue Mitra'}`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useLiveRefetch(load)

  const data = live.overview || admin
  const totals = data?.totals || {}
  const departments = data?.departments || []
  const doctors = admin?.doctors
  const loading = !data && !live.error && !error

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${currentUser.name.split(' ')[0]}`}
        subtitle={`Today at ${hospital?.name || 'the hospital'} — everything on this page updates live.`}
        actions={
          <>
            <Button icon="user-plus" onClick={() => navigate('/admin/counter')}>
              Register a patient
            </Button>
            <Button variant="primary" icon="queue" onClick={() => navigate('/admin/queues')}>
              Open queue console
            </Button>
          </>
        }
      />

      {(live.error || error) && !data && <InlineError error={live.error || error} onRetry={() => (live.refresh(), load())} />}

      {loading ? (
        <div className="sx-stats">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} height={92} style={{ borderRadius: 12 }} />
          ))}
        </div>
      ) : (
        <div className="sx-stats" aria-label="Today's totals">
          <Stat label="Registered today" icon="ticket" value={totals.registeredToday ?? 0} />
          <Stat label="Waiting" icon="users" value={totals.waiting ?? 0} />
          <Stat label="Being seen" icon="doctor" value={totals.serving ?? 0} />
          <Stat label="Completed" icon="check-circle" value={totals.completed ?? 0} />
          <Stat label="No-shows" icon="user-x" value={totals.noShow ?? 0} />
          <Stat label="Urgent, not seen yet" icon="alert" value={totals.urgentOpen ?? 0} alert={totals.urgentOpen > 0} hint={totals.urgentOpen > 0 ? 'Shown in red at the top' : 'None open'} />
        </div>
      )}

      {data && <Checklist departments={departments.length} doctors={doctors ? doctors.length : 1} registered={totals.registeredToday || 0} />}

      <Card
        title="Departments right now"
        icon="layers"
        actions={
          departments.length > 0 && (
            <Button size="sm" variant="ghost" iconRight="arrow-right" onClick={() => navigate('/admin/queues')}>
              Manage queues
            </Button>
          )
        }
      >
        {loading ? (
          <SkeletonCards count={3} height={170} />
        ) : departments.length === 0 ? (
          <EmptyState
            icon="layers"
            title="No departments yet"
            action={
              <Button variant="primary" icon="plus" onClick={() => navigate('/admin/departments')}>
                Add your first department
              </Button>
            }
          >
            Add the OPD departments that run today. Patients pick one when they register, and each gets its own live queue.
          </EmptyState>
        ) : (
          <div className="qc-dept-grid">
            {departments.map((d) => (
              <DepartmentCard key={d._id || d.code} d={d} />
            ))}
          </div>
        )}
      </Card>
    </>
  )
}

export default function AdminDashboard() {
  return (
    <StaffShell>
      <Overview />
    </StaffShell>
  )
}
