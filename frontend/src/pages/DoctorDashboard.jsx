import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import { Icon } from '../components/common/Icons.jsx'
import StaffShell, { useLiveRefetch } from '../components/staff/StaffShell.jsx'
import {
  Button,
  Card,
  Chip,
  CrowdBadge,
  Dialog,
  EmptyState,
  InlineError,
  Notice,
  SelectField,
  Skeleton,
  GENDER_LABEL,
  LANG_SHORT,
  aboutWait,
  clockTime,
  errorText,
  minutesSince,
  useConfirm,
  useNow,
  useToast,
} from '../components/staff/ui.jsx'
import './doctor.css'

const isAssisted = (t) => Boolean(t?.isAssisted || t?.assisted)
const isUrgent = (t) => (typeof t?.urgent === 'object' ? Boolean(t.urgent?.raised && !t.urgent?.seenAt) : Boolean(t?.urgent))
const firstName = (t) => t?.patient?.firstName || t?.firstName || 'Patient'
const ageGender = (t) => {
  const p = t?.patient || t || {}
  return [p.age !== undefined && p.age !== null ? `${p.age} yrs` : null, GENDER_LABEL[p.gender] || null].filter(Boolean).join(' · ')
}

function statusText(s) {
  if (!s || !s.state || s.state === 'available') return 'Available — patients see “Doctor is in the room”'
  if (s.state === 'on_break') return s.until ? `On a break until ${clockTime(s.until)}` : 'On a break'
  if (s.state === 'running_late') return `Running late by ${s.delayMinutes || 0} min`
  return 'Not available'
}

/* ---------------- Status controls ---------------- */
function StatusCard({ status, onSet, busy }) {
  const [time, setTime] = useState('')
  const state = status?.state || 'available'
  const inMinutes = (m) => new Date(Date.now() + m * 60000).toISOString()
  const setBreakAt = () => {
    if (!time) return
    const [h, m] = time.split(':').map(Number)
    const d = new Date()
    d.setHours(h, m, 0, 0)
    if (d < new Date()) d.setDate(d.getDate() + 1)
    onSet({ state: 'on_break', until: d.toISOString() })
  }
  const currentDelay = state === 'running_late' ? Number(status?.delayMinutes) || 0 : 0

  return (
    <Card title="Your status" icon="activity">
      <p className="dr-status-now" data-state={state} role="status">
        <Icon name={state === 'available' ? 'check-circle' : state === 'on_break' ? 'coffee' : state === 'running_late' ? 'clock' : 'alert'} size={18} />
        {statusText(status)}
      </p>
      <div className="dr-status-group">
        <h3>
          <Icon name="check-circle" size={16} /> In the room
        </h3>
        <div>
          <Button
            variant={state === 'available' ? 'primary' : undefined}
            icon="check"
            busy={busy === 'available'}
            onClick={() => onSet({ state: 'available' })}
          >
            Available
          </Button>
        </div>
      </div>
      <div className="dr-status-group">
        <h3>
          <Icon name="coffee" size={16} /> Take a break
        </h3>
        <p>Patients see when you will be back, and their wait time includes it.</p>
        <div className="sx-row">
          {[10, 15, 30].map((m) => (
            <Button key={m} size="sm" icon="coffee" busy={busy === `break${m}`} onClick={() => onSet({ state: 'on_break', until: inMinutes(m) }, `break${m}`)}>
              {m} min
            </Button>
          ))}
        </div>
        <div className="dr-time">
          <label className="sx-field">
            <span className="sx-field__label">Back at</span>
            <input className="sx-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
          <Button icon="clock" disabled={!time} busy={busy === 'breakAt'} onClick={setBreakAt}>
            Set break
          </Button>
        </div>
      </div>
      <div className="dr-status-group">
        <h3>
          <Icon name="clock" size={16} /> Running late
        </h3>
        <p>{currentDelay ? `Now ${currentDelay} min late. Add more:` : 'Adds the delay to every waiting patient’s estimate.'}</p>
        <div className="sx-row">
          {[5, 10, 15].map((m) => (
            <Button
              key={m}
              size="sm"
              icon="plus"
              busy={busy === `late${m}`}
              onClick={() => onSet({ state: 'running_late', delayMinutes: currentDelay + m }, `late${m}`)}
            >
              {m} min
            </Button>
          ))}
        </div>
      </div>
    </Card>
  )
}

/* ---------------- Transfer dialog ---------------- */
function TransferDialog({ ticket, ownCode, onClose, onDone }) {
  const [departments, setDepartments] = useState(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!ticket) return
    setCode('')
    setError(null)
    api
      .departments()
      .then((res) => setDepartments((res.departments || res || []).filter((d) => d.code !== ownCode && d.isActive !== false)))
      .catch((e) => setError(e))
  }, [ticket, ownCode])

  const submit = async () => {
    if (!code) return setError(new Error('Choose a department.'))
    setBusy(true)
    setError(null)
    try {
      await api.transfer(ticket.id || ticket._id, code)
      onDone(departments.find((d) => d.code === code))
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={Boolean(ticket)}
      onClose={onClose}
      title={`Move ${ticket?.tokenNumber || ''} to another department`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon="transfer" busy={busy} onClick={submit} disabled={!departments?.length}>
            Move patient
          </Button>
        </>
      }
    >
      <p className="sx-muted">{firstName(ticket)} gets a new token in that department and their phone shows the new room.</p>
      {!departments && !error && <Skeleton height={42} />}
      {departments && departments.length === 0 && <Notice tone="warn">There is no other department to move this patient to.</Notice>}
      {departments && departments.length > 0 && (
        <SelectField label="Department" value={code} onChange={(e) => setCode(e.target.value)}>
          <option value="">Choose a department</option>
          {departments.map((d) => (
            <option key={d.code} value={d.code}>
              {d.name}
              {d.rooms?.[0] ? ` · ${d.rooms[0]}` : ''}
            </option>
          ))}
        </SelectField>
      )}
      {error && <InlineError error={error} />}
    </Dialog>
  )
}

/* ---------------- Console ---------------- */
function DoctorConsole() {
  const { currentUser } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const now = useNow(30000)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [transferring, setTransferring] = useState(null)
  const [status, setStatus] = useState(currentUser?.status || null)

  const load = useCallback(async () => {
    try {
      const res = await api.dashboard()
      setData(res)
      setError(null)
      const me = (res.queue?.doctors || []).find(
        (d) => (d._id && d._id === currentUser?._id) || (d.name === currentUser?.name && (!d.room || d.room === currentUser?.room)),
      )
      if (me) setStatus(me.status || { state: me.state, until: me.until, delayMinutes: me.delayMinutes })
    } catch (e) {
      setError(e)
    }
  }, [currentUser])

  useEffect(() => {
    load()
  }, [load])
  useLiveRefetch(load)

  useEffect(() => {
    document.title = `Room console · ${currentUser?.name || 'Doctor'}`
  }, [currentUser])

  const run = async (key, fn, success) => {
    setBusy(key)
    setActionError(null)
    try {
      const res = await fn()
      if (success) toast(typeof success === 'function' ? success(res) : success)
      await load()
      return res
    } catch (e) {
      if (e.status === 404 && key === 'call') toast('No one is waiting right now.', 'error')
      else setActionError(errorText(e))
      return null
    } finally {
      setBusy(null)
    }
  }

  const current = data?.current
  const waiting = data?.waiting || []
  const queue = data?.queue || {}
  const dept = queue.department || {}
  const crowd = queue.overcrowding || {}
  const room = currentUser?.room || dept.rooms?.[0]

  const callNext = () =>
    run(
      'call',
      () => api.callNext(),
      (res) => {
        const t = res?.called || res?.ticket
        return t ? `Called ${t.tokenNumber} — ${firstName(t)}. The board is announcing it.` : 'Queue is empty.'
      },
    )
  const complete = () => run('complete', () => api.complete(current.id || current._id), `${current.tokenNumber} marked as seen.`)
  const noShow = async () => {
    const ok = await confirm({
      title: `Mark ${current.tokenNumber} as a no-show?`,
      message: `${firstName(current)} did not come in. They leave the queue; staff can register them again if they arrive later.`,
      confirmLabel: 'Mark no-show',
      icon: 'no-show',
      danger: true,
    })
    if (ok) run('noshow', () => api.noShow(current.id || current._id), `${current.tokenNumber} marked as no-show.`)
  }
  const requeue = () => run('requeue', () => api.requeue(current.id || current._id), `${current.tokenNumber} sent to the end of the queue.`)

  const setDoctorStatus = async (body, key = body.state) => {
    setBusy(key)
    setActionError(null)
    try {
      const res = await api.setStatus(body)
      const s = res?.user?.status || res?.status || { state: body.state, until: body.until || null, delayMinutes: body.delayMinutes || 0 }
      setStatus(s)
      toast(`Status: ${statusText(s).split(' — ')[0]}. Patients see this now.`)
      load()
    } catch (e) {
      setActionError(errorText(e))
    } finally {
      setBusy(null)
    }
  }

  if (error && !data) {
    if (error.status === 400)
      return (
        <EmptyState icon="doctor" title="You are not assigned to a department yet">
          Ask your hospital administrator to set your department and room under People. This page updates once that is done.
        </EmptyState>
      )
    return <InlineError error={error} onRetry={load} />
  }

  if (!data)
    return (
      <div className="sx-grid" aria-busy="true">
        <Skeleton height={40} width="45%" />
        <div className="dr-layout">
          <div className="dr-col">
            <Skeleton height={260} style={{ borderRadius: 12 }} />
            <Skeleton height={300} style={{ borderRadius: 12 }} />
          </div>
          <Skeleton height={420} style={{ borderRadius: 12 }} />
        </div>
      </div>
    )

  return (
    <>
      <div className="dr-head">
        <div>
          <h1>{currentUser?.name}</h1>
          <div className="dr-head__meta">
            <Chip tone="teal" icon="door">
              {room || 'No room set'}
            </Chip>
            <Chip icon="layers">{dept.name || currentUser?.departmentName || currentUser?.departmentCode}</Chip>
            {dept.floor !== undefined && dept.floor !== null && <Chip icon="lift">Floor {dept.floor}</Chip>}
          </div>
        </div>
        <div className="dr-head__stats">
          <div className="dr-mini">
            <span>Waiting</span>
            <strong>{queue.waitingCount ?? waiting.length}</strong>
          </div>
          <div className="dr-mini">
            <span>New patient waits</span>
            <strong>{queue.estimatedWaitMinutes ? `${queue.estimatedWaitMinutes} min` : '—'}</strong>
          </div>
          <div className="dr-mini">
            <span>Waiting area</span>
            <strong style={{ fontSize: '0.95rem', paddingTop: 4 }}>
              <CrowdBadge level={crowd.status || 'green'} waiting={crowd.waitingCount} seats={crowd.capacity} />
            </strong>
          </div>
        </div>
      </div>

      {actionError && <InlineError>{actionError}</InlineError>}

      <div className="dr-layout">
        <div className="dr-col">
          <Card
            title="Now in your room"
            icon="user"
            actions={
              <Button
                variant="primary"
                size="lg"
                className="dr-call"
                icon="megaphone"
                busy={busy === 'call'}
                onClick={callNext}
                disabled={!waiting.length && !current}
              >
                {current ? 'Finish & call next' : 'Call next patient'}
              </Button>
            }
          >
            {current ? (
              <div className="sx-grid">
                <div className="dr-now">
                  <div>
                    <span className="dr-now__label">Token</span>
                    <div className="dr-now__token">{current.tokenNumber}</div>
                  </div>
                  <div>
                    <p className="dr-now__name">{firstName(current)}</p>
                    <p className="dr-now__facts">
                      {ageGender(current) && (
                        <span>
                          <Icon name="user" size={16} /> {ageGender(current)}
                        </span>
                      )}
                      {current.language && (
                        <span>
                          <Icon name="message" size={16} /> Speaks {LANG_SHORT[current.language] || current.language}
                        </span>
                      )}
                      {current.calledAt && (
                        <span>
                          <Icon name="clock" size={16} /> Called{' '}
                          {minutesSince(current.calledAt, now) < 1 ? 'just now' : `${minutesSince(current.calledAt, now)} min ago`}
                        </span>
                      )}
                    </p>
                    <div className="dr-now__chips">
                      {isUrgent(current) && (
                        <Chip tone="red" icon="alert">
                          Asked for urgent help
                        </Chip>
                      )}
                      {isAssisted(current) && (
                        <Chip tone="amber" icon="accessibility">
                          Needs assistance
                        </Chip>
                      )}
                      {current.isEmergency && (
                        <Chip tone="red" icon="emergency">
                          Emergency signs reported
                        </Chip>
                      )}
                    </div>
                  </div>
                </div>
                <div className="dr-actions">
                  <Button variant="primary" icon="check" busy={busy === 'complete'} onClick={complete}>
                    Complete
                  </Button>
                  <Button icon="skip" busy={busy === 'requeue'} onClick={requeue}>
                    Send to end
                  </Button>
                  <Button icon="transfer" onClick={() => setTransferring(current)}>
                    Transfer
                  </Button>
                  <Button variant="danger" icon="no-show" busy={busy === 'noshow'} onClick={noShow}>
                    No-show
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyState compact icon="door" title={waiting.length ? 'Ready for the next patient' : 'No one is waiting right now'}>
                {waiting.length
                  ? `${waiting.length} ${waiting.length === 1 ? 'person is' : 'people are'} waiting. Press “Call next patient” — their phone and the TV board will call them to ${room || 'your room'}.`
                  : 'New registrations for your department appear here instantly.'}
              </EmptyState>
            )}
          </Card>
          <Card
            title={`Waiting (${waiting.length})`}
            icon="users"
            bodyClass={null}
            actions={queue.estimatedWaitMinutes ? <span className="sx-small sx-muted">Last in line: {aboutWait(queue.estimatedWaitMinutes)}</span> : null}
          >
            {waiting.length === 0 ? (
              <EmptyState compact icon="users" title="No one is waiting right now">
                Patients who register for {dept.name || 'your department'} appear here in order.
              </EmptyState>
            ) : (
              <ol className="dr-wait">
                {waiting.map((t, i) => {
                  const mins = minutesSince(t.createdAt, now)
                  return (
                    <li key={t.id || t._id || t.publicId} data-urgent={isUrgent(t)}>
                      <span className="dr-wait__pos" aria-label={`Position ${i + 1}`}>
                        {i + 1}
                      </span>
                      <span className="dr-wait__token">{t.tokenNumber}</span>
                      <span className="dr-wait__who">
                        <strong>{firstName(t)}</strong>
                        <small>
                          {[ageGender(t), t.language ? LANG_SHORT[t.language] || t.language : null, `waiting ${mins < 1 ? 'under a minute' : `${mins} min`}`]
                            .filter(Boolean)
                            .join(' · ')}
                        </small>
                      </span>
                      <span className="dr-wait__badges">
                        {isUrgent(t) && (
                          <Chip tone="red" icon="alert">
                            Urgent
                          </Chip>
                        )}
                        {isAssisted(t) && <Chip tone="amber">Assisted</Chip>}
                      </span>
                    </li>
                  )
                })}
              </ol>
            )}
          </Card>
        </div>

        <div className="dr-col">
          <StatusCard status={status} onSet={setDoctorStatus} busy={busy} />
        </div>
      </div>

      <TransferDialog
        ticket={transferring}
        ownCode={dept.code || currentUser?.departmentCode}
        onClose={() => setTransferring(null)}
        onDone={(d) => {
          toast(`${transferring.tokenNumber} moved to ${d?.name || 'the new department'}.`)
          setTransferring(null)
          load()
        }}
      />
    </>
  )
}

export default function DoctorDashboard() {
  return (
    <StaffShell roles={['doctor']} variant="doctor">
      <DoctorConsole />
    </StaffShell>
  )
}
