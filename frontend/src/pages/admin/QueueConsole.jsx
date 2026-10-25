import { useState } from 'react'
import { api } from '../../api/client.js'
import { navigate } from '../../router.jsx'
import { Icon } from '../../components/common/Icons.jsx'
import StaffShell, { useStaffLive } from '../../components/staff/StaffShell.jsx'
import {
  Button,
  Chip,
  CrowdBadge,
  DoctorStatusChip,
  EmptyState,
  InlineError,
  PageHeader,
  SkeletonCards,
  aboutWait,
  clockTime,
  deptIcon,
  errorText,
  minutesSince,
  useConfirm,
  useNow,
  useToast,
} from '../../components/staff/ui.jsx'
import './console.css'

function useAction() {
  const toast = useToast()
  const live = useStaffLive()
  const [busy, setBusy] = useState(null)
  const run = async (key, fn, ok) => {
    setBusy(key)
    try {
      const res = await fn()
      if (ok) toast(typeof ok === 'function' ? ok(res) : ok)
      live.refresh()
    } catch (e) {
      toast(e.status === 404 && /empty/i.test(e.message) ? 'No one is waiting in this queue.' : errorText(e), 'error')
    } finally {
      setBusy(null)
    }
  }
  return { busy, run }
}

function DoctorStatusControl({ doctor, run, busy }) {
  const set = (body, msg) => run(`st-${doctor._id}`, () => api.setDoctorStatus(doctor._id, body), msg)
  return (
    <div className="sx-row">
      <DoctorStatusChip status={doctor.status} />
      <select
        className="sx-select"
        style={{ width: 'auto', minHeight: 34, padding: '4px 30px 4px 8px', fontSize: '0.85rem' }}
        aria-label={`Change status for ${doctor.name}`}
        value=""
        disabled={busy === `st-${doctor._id}`}
        onChange={(e) => {
          const v = e.target.value
          if (v === 'available') set({ state: 'available' }, `${doctor.name} is available`)
          else if (v.startsWith('break')) set({ state: 'on_break', until: new Date(Date.now() + Number(v.split('-')[1]) * 60000).toISOString() }, `${doctor.name} is on break — patients can see it`)
          else if (v.startsWith('late')) set({ state: 'running_late', delayMinutes: Number(v.split('-')[1]) }, `${doctor.name} is running late — wait times updated`)
        }}
      >
        <option value="">Change status…</option>
        <option value="available">Available</option>
        <option value="break-10">On break · 10 min</option>
        <option value="break-15">On break · 15 min</option>
        <option value="break-30">On break · 30 min</option>
        <option value="late-5">Running late · 5 min</option>
        <option value="late-10">Running late · 10 min</option>
        <option value="late-15">Running late · 15 min</option>
        <option value="late-30">Running late · 30 min</option>
      </select>
    </div>
  )
}

function MoveSelect({ ticket, d, departments, run, busy }) {
  const others = departments.filter((x) => x.code !== d.code)
  if (!others.length) return null
  return (
    <select
      className="sx-select"
      style={{ width: 'auto', minHeight: 34, padding: '4px 30px 4px 8px', fontSize: '0.85rem' }}
      aria-label={`Move ${ticket.tokenNumber} to another department`}
      value=""
      disabled={busy === `mv-${ticket.ticketId}`}
      onChange={(e) => {
        const code = e.target.value
        if (code) run(`mv-${ticket.ticketId}`, () => api.transfer(ticket.ticketId, code), (r) => `Moved to ${others.find((o) => o.code === code)?.name}${r?.tokenNumber ? ` — new token ${r.tokenNumber}` : ''}`)
      }}
    >
      <option value="">Move to…</option>
      {others.map((o) => (
        <option key={o.code} value={o.code}>
          {o.name}
        </option>
      ))}
    </select>
  )
}

function DepartmentQueue({ d, departments, now }) {
  const { busy, run } = useAction()
  const confirm = useConfirm()
  const rooms = d.rooms?.length ? d.rooms : ['Room']

  return (
    <section className="sx-card" aria-label={d.name}>
      <header className="qc-dept__head">
        <span className="qc-dept__icon" aria-hidden="true">
          <Icon name={deptIcon(d)} size={20} />
        </span>
        <div className="qc-dept__title">
          <h3>{d.name}</h3>
          <span className="sx-small sx-muted">
            {d.waitingCount ?? 0} waiting · new patient waits {aboutWait(d.estimatedWaitMinutes)} · ~{d.avgConsultMinutes} min each
          </span>
        </div>
        <CrowdBadge level={d.crowd} waiting={d.waitingCount ?? 0} seats={d.seatingCapacity} />
      </header>
      <div className="sx-card__body" style={{ display: 'grid', gap: 12 }}>
        {rooms.map((room) => {
          const serving = (d.nowServing || []).filter((n) => n.room === room)
          const docs = (d.doctors || []).filter((x) => x.room === room)
          return (
            <div key={room} className="qc-room">
              <div className="sx-between">
                <strong>
                  <Icon name="door" size={16} /> {room}
                </strong>
                <Button variant="primary" size="sm" icon="megaphone" busy={busy === `call-${room}`} onClick={() => run(`call-${room}`, () => api.callNextFor(d.code, room), (r) => (r?.ticket || r?.called ? `Called ${(r.ticket || r.called).tokenNumber} to ${room}` : 'Called next patient'))}>
                  Call next
                </Button>
              </div>
              {docs.length ? (
                docs.map((doc) => (
                  <div key={doc._id} className="sx-between">
                    <span className="sx-small">{doc.name}</span>
                    <DoctorStatusControl doctor={doc} run={run} busy={busy} />
                  </div>
                ))
              ) : (
                <span className="sx-small sx-muted">No doctor assigned to this room.</span>
              )}
              {serving.length === 0 ? (
                <span className="sx-small sx-muted">No one is being seen.</span>
              ) : (
                serving.map((s) => (
                  <div key={s.ticketId} style={{ display: 'grid', gap: 8 }}>
                    <div className="qc-serving">
                      <span className="sx-small sx-muted">Now serving</span>
                      <span className="sx-token">{s.tokenNumber}</span>
                      <span>{s.firstName}</span>
                      <span className="sx-small sx-muted">called {clockTime(s.calledAt)}</span>
                    </div>
                    <div className="sx-row">
                      <Button size="sm" icon="check" busy={busy === `done-${s.ticketId}`} onClick={() => run(`done-${s.ticketId}`, () => api.complete(s.ticketId), `${s.tokenNumber} completed`)}>
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        icon="user-x"
                        busy={busy === `ns-${s.ticketId}`}
                        onClick={async () => {
                          if (await confirm({ title: `Mark ${s.tokenNumber} as no-show?`, message: `${s.firstName} did not come to ${room}. They will be removed from today's queue.`, confirmLabel: 'Mark no-show', danger: true, icon: 'user-x' }))
                            run(`ns-${s.ticketId}`, () => api.noShow(s.ticketId), `${s.tokenNumber} marked as no-show`)
                        }}
                      >
                        No-show
                      </Button>
                      <Button size="sm" icon="skip" busy={busy === `rq-${s.ticketId}`} onClick={() => run(`rq-${s.ticketId}`, () => api.requeue(s.ticketId), `${s.tokenNumber} sent to the end of the queue`)}>
                        Send to end
                      </Button>
                      <MoveSelect ticket={s} d={d} departments={departments} run={run} busy={busy} />
                    </div>
                  </div>
                ))
              )}
            </div>
          )
        })}

        <div>
          <p className="sx-small sx-muted" style={{ fontWeight: 700, marginBottom: 4 }}>
            WAITING ({d.waiting?.length || 0})
          </p>
          {!d.waiting?.length ? (
            <span className="sx-small sx-muted">No one is waiting.</span>
          ) : (
            d.waiting.map((w) => (
              <div key={w.ticketId} className="qc-wait-row">
                <span className="sx-token">{w.tokenNumber}</span>
                <span className="qc-wait-row__name">
                  {w.firstName}
                  {w.age ? <span className="sx-small sx-muted"> · {w.age}{w.gender ? ` ${w.gender[0].toUpperCase()}` : ''}</span> : null}
                  <span className="sx-small sx-muted"> · waiting {minutesSince(w.createdAt, now)} min</span>
                </span>
                {w.urgent && <Chip tone="red" icon="alert">Urgent</Chip>}
                {w.isEmergency && <Chip tone="red">Emergency</Chip>}
                {w.assisted && <Chip tone="teal" icon="accessibility">Assisted</Chip>}
                <Button size="sm" variant="ghost" icon="skip" busy={busy === `rq-${w.ticketId}`} onClick={() => run(`rq-${w.ticketId}`, () => api.requeue(w.ticketId), `${w.tokenNumber} sent to the end`)}>
                  To end
                </Button>
                <MoveSelect ticket={w} d={d} departments={departments} run={run} busy={busy} />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

function Console() {
  const live = useStaffLive()
  const now = useNow(30000)
  const departments = live.overview?.departments || []
  return (
    <>
      <PageHeader
        title="Queue console"
        subtitle="Every department's queue, live. Calls show on the patient's phone and the TV board at once. A real hospital would connect staff sign-in to its staff directory."
        actions={
          <Button icon="user-plus" onClick={() => navigate('/admin/counter')}>
            Register a patient
          </Button>
        }
      />
      {live.error && !live.overview && <InlineError error={live.error} onRetry={live.refresh} />}
      {!live.overview && !live.error ? (
        <SkeletonCards count={3} height={260} />
      ) : departments.length === 0 && live.overview ? (
        <div className="sx-card">
          <EmptyState icon="layers" title="No departments yet" action={<Button variant="primary" icon="plus" onClick={() => navigate('/admin/departments')}>Add a department</Button>}>
            Queues appear here once OPD departments are set up.
          </EmptyState>
        </div>
      ) : (
        <div className="sx-grid sx-grid--2">
          {departments.map((d) => (
            <DepartmentQueue key={d._id || d.code} d={d} departments={departments} now={now} />
          ))}
        </div>
      )}
    </>
  )
}

export default function QueueConsole() {
  return (
    <StaffShell roles={['admin', 'superadmin', 'staff']}>
      <Console />
    </StaffShell>
  )
}
