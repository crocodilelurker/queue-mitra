import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useHospital } from '../../context/Hospital.jsx'
import { navigate } from '../../router.jsx'
import { Icon } from '../../components/common/Icons.jsx'
import StaffShell from '../../components/staff/StaffShell.jsx'
import { Button, Card, Chip, InlineError, Notice, PageHeader, PasswordField, TextField, clockTime, errorText, useConfirm, useToast } from '../../components/staff/ui.jsx'
import './admin-pages.css'

const SPEEDS = [
  { key: 1, label: '1× real time', ms: 30000, hint: 'one queue step every 30 seconds' },
  { key: 10, label: '10× faster', ms: 3000, hint: 'one queue step every 3 seconds' },
]

function detailsFrom(h) {
  return {
    name: h?.name || '',
    line: h?.address?.line || '',
    city: h?.address?.city || '',
    state: h?.address?.state || '',
    pincode: h?.address?.pincode || '',
    phone: h?.contact?.phone || '',
    emergencyPhone: h?.contact?.emergencyPhone || '',
  }
}

/* ---------- Hospital details ---------- */
function DetailsCard() {
  const { hospital, refresh } = useHospital()
  const toast = useToast()
  const [form, setForm] = useState(() => detailsFrom(hospital))
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const dirty = JSON.stringify(form) !== JSON.stringify(detailsFrom(hospital))

  useEffect(() => {
    if (!dirty) setForm(detailsFrom(hospital))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospital])

  const submit = async (e) => {
    e.preventDefault()
    const err = {}
    if (form.name.trim().length < 3) err.name = 'Enter the hospital name (at least 3 letters).'
    if (form.pincode && !/^\d{6}$/.test(form.pincode.trim())) err.pincode = 'PIN code must be 6 digits.'
    if (form.phone && !/^[0-9+\-\s]{6,20}$/.test(form.phone.trim())) err.phone = 'Use digits, spaces, + or - only.'
    if (form.emergencyPhone && !/^[0-9+\-\s]{3,20}$/.test(form.emergencyPhone.trim())) err.emergencyPhone = 'Use digits, spaces, + or - only.'
    setErrors(err)
    if (Object.keys(err).length) return
    setBusy(true)
    setError(null)
    try {
      await api.updateHospital({
        name: form.name.trim(),
        address: { line: form.line.trim(), city: form.city.trim(), state: form.state.trim(), pincode: form.pincode.trim() || undefined },
        contact: { phone: form.phone.trim(), emergencyPhone: form.emergencyPhone.trim() },
      })
      await refresh()
      toast('Hospital details saved')
    } catch (e2) {
      setError(e2)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="ap-span">
      <Card
        title="Hospital details"
        icon="hospital-building"
        footer={
          <>
            {dirty && (
              <Button onClick={() => (setForm(detailsFrom(hospital)), setErrors({}))} disabled={busy}>
                Discard changes
              </Button>
            )}
            <Button type="submit" variant="primary" icon="check" busy={busy} disabled={!dirty}>
              Save details
            </Button>
          </>
        }
      >
        <div className="sx-form">
          <p className="sx-muted sx-small">Shown on patient phones, printed slips and the waiting-room TV board.</p>
          <TextField label="Hospital name" value={form.name} onChange={set('name')} error={errors.name} />
          <TextField label="Address" optional value={form.line} onChange={set('line')} placeholder="Street and area" />
          <div className="sx-form-grid ap-top">
            <TextField label="City" optional value={form.city} onChange={set('city')} />
            <TextField label="State" optional value={form.state} onChange={set('state')} />
            <TextField label="PIN code" optional inputMode="numeric" maxLength={6} value={form.pincode} onChange={set('pincode')} error={errors.pincode} />
          </div>
          <div className="sx-form-grid ap-top">
            <TextField label="Hospital phone" optional inputMode="tel" value={form.phone} onChange={set('phone')} error={errors.phone} />
            <TextField label="Emergency (Casualty) phone" optional inputMode="tel" value={form.emergencyPhone} onChange={set('emergencyPhone')} error={errors.emergencyPhone} hint="Shown with 112 and 108 on the Emergency screen and the TV board." />
          </div>
          <InlineError error={error} />
        </div>
      </Card>
    </form>
  )
}

/* ---------- Staff PIN ---------- */
function PinCard() {
  const toast = useToast()
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    const err = {}
    if (!/^\d{4,6}$/.test(pin)) err.pin = 'The PIN must be 4 to 6 digits.'
    else if (pin !== pin2) err.pin2 = 'The two PINs do not match.'
    setErrors(err)
    if (Object.keys(err).length) return
    setBusy(true)
    setError(null)
    try {
      await api.updateHospital({ staffPin: pin })
      setPin('')
      setPin2('')
      toast('Counter PIN changed. Share the new PIN with counter staff.')
    } catch (e2) {
      setError(e2)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <Card
        title="Counter PIN"
        icon="key"
        footer={
          <Button type="submit" variant="primary" icon="lock" busy={busy} disabled={!pin}>
            Change PIN
          </Button>
        }
      >
        <div className="sx-form">
          <p className="sx-muted sx-small">Counter staff sign in with this PIN. It opens the queue console and the registration counter only. People already signed in stay signed in.</p>
          <div className="sx-form-grid">
            <PasswordField label="New PIN (4–6 digits)" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} error={errors.pin} autoComplete="new-password" />
            <PasswordField label="Type it again" inputMode="numeric" maxLength={6} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))} error={errors.pin2} autoComplete="new-password" />
          </div>
          <InlineError error={error} />
        </div>
      </Card>
    </form>
  )
}

/* ---------- Links ---------- */
function LinksCard() {
  const { hospital } = useHospital()
  return (
    <Card title="Screens for this hospital" icon="tv">
      <dl className="ap-kv">
        <dt>Hospital code</dt>
        <dd className="ap-code">{hospital?.code}</dd>
        <dt>Patient app</dt>
        <dd>
          <a href="/" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>
            {window.location.origin}/ <Icon name="external" size={13} />
          </a>
        </dd>
        <dt>TV board</dt>
        <dd>
          <a href="/board" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>
            {window.location.origin}/board <Icon name="external" size={13} />
          </a>
        </dd>
        <dt>Staff sign in</dt>
        <dd>{window.location.origin}/login</dd>
      </dl>
      <p className="sx-small sx-muted" style={{ marginTop: 12 }}>
        Put a QR code to the patient app at the gate and registration counters. Open the TV board on the waiting-hall screen and tap “Turn on announcements”.
      </p>
    </Card>
  )
}

/* ---------- Demo controls ---------- */
function DemoCard() {
  const toast = useToast()
  const confirm = useConfirm()
  const [status, setStatus] = useState(null)
  const [statusError, setStatusError] = useState(null)
  const [speed, setSpeed] = useState(10)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)

  const loadStatus = useCallback(async () => {
    try {
      const s = await api.simulationStatus()
      setStatus(s)
      setStatusError(null)
      if (s?.isRunning && s.intervalMs) setSpeed(s.intervalMs <= 5000 ? 10 : 1)
    } catch (e) {
      setStatusError(e)
    }
  }, [])

  useEffect(() => {
    loadStatus()
    const t = setInterval(loadStatus, 5000)
    return () => clearInterval(t)
  }, [loadStatus])

  const running = Boolean(status?.isRunning ?? status?.running ?? status?.active)

  const start = async (sp = speed) => {
    setBusy('sim')
    setError(null)
    try {
      setStatus(await api.startSimulation(SPEEDS.find((s) => s.key === sp).ms))
      toast(`Auto-advance is on (${sp}×)`)
    } catch (e) {
      setError(e)
    } finally {
      setBusy(null)
    }
  }
  const stop = async () => {
    setBusy('sim')
    setError(null)
    try {
      setStatus(await api.stopSimulation())
      toast('Auto-advance is off')
    } catch (e) {
      setError(e)
    } finally {
      setBusy(null)
    }
  }
  const changeSpeed = (sp) => {
    setSpeed(sp)
    if (running) start(sp)
  }

  const clearQueue = async () => {
    const ok = await confirm({
      title: 'Clear today’s queue?',
      message: 'This removes all of today’s tokens, urgent flags and doctor delays, and token numbers start again from 001. Your hospital, departments, doctors and staff accounts are kept. Every open screen refreshes.',
      confirmLabel: 'Clear today’s queue',
      danger: true,
    })
    if (!ok) return
    setBusy('reset')
    setError(null)
    try {
      await api.resetQueue()
      toast('Today’s queue was cleared')
      loadStatus()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card title="Demo controls" icon="play" className="ap-span">
      <div className="sx-form">
        <div className="sx-between" style={{ alignItems: 'flex-start' }}>
          <div style={{ maxWidth: '62ch' }}>
            <strong>Auto-advance queues</strong>
            <p className="sx-small sx-muted" style={{ marginTop: 2 }}>
              Calls the next patient and completes the previous one in every room, on its own — so the whole flow can be shown hands-free. It only moves patients who really registered; it never adds sample patients.
            </p>
          </div>
          <label className="ap-switch">
            <input type="checkbox" role="switch" checked={running} disabled={busy === 'sim' || Boolean(statusError && !status)} onChange={(e) => (e.target.checked ? start() : stop())} />
            {running ? 'On' : 'Off'}
          </label>
        </div>
        <div className="ap-sim">
          <span className="sx-small" style={{ fontWeight: 640 }}>
            Speed
          </span>
          <div className="sx-seg" role="group" aria-label="Simulation speed">
            {SPEEDS.map((s) => (
              <button key={s.key} type="button" aria-pressed={speed === s.key} onClick={() => changeSpeed(s.key)} disabled={busy === 'sim'}>
                <Icon name="clock" size={15} /> {s.label}
              </button>
            ))}
          </div>
          <span className="sx-small sx-muted">{SPEEDS.find((s) => s.key === speed)?.hint}</span>
        </div>
        {running && (
          <Notice icon="activity">
            Running{status?.ticksCount ? ` · ${status.ticksCount} step${status.ticksCount === 1 ? '' : 's'} so far` : ''}
            {status?.lastStepAt ? ` · last step at ${clockTime(status.lastStepAt)}` : ''}
            {status?.lastAction ? ` · ${status.lastAction}` : ''}
          </Notice>
        )}
        {statusError && !status && <p className="sx-small sx-muted">Auto-advance status is not available right now ({errorText(statusError)}).</p>}
        <hr className="ap-divider" />
        <div className="sx-between">
          <div style={{ maxWidth: '62ch' }}>
            <strong>Clear today’s queue</strong>
            <p className="sx-small sx-muted" style={{ marginTop: 2 }}>
              Start the day again: removes today’s tokens and urgent flags. Keeps the hospital, departments and people.
            </p>
          </div>
          <Button variant="danger" icon="refresh" busy={busy === 'reset'} onClick={clearQueue}>
            Clear today’s queue
          </Button>
        </div>
        <InlineError error={error} />
      </div>
    </Card>
  )
}

/* ---------- Danger zone ---------- */
function DangerCard() {
  const { currentUser, logout } = useAuth()
  const { hospital, refresh } = useHospital()
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const isOwner = currentUser?.role === 'superadmin'
  const code = hospital?.code || ''
  const match = typed.trim().toUpperCase() === code && Boolean(code)

  const reset = async (e) => {
    e.preventDefault()
    if (!match) return
    setBusy(true)
    setError(null)
    try {
      await api.factoryReset(code)
      await logout()
      await refresh() // configured=false: the app now opens the setup wizard
      navigate('/setup', { replace: true })
    } catch (e2) {
      setError(e2)
      setBusy(false)
    }
  }

  return (
    <Card title="Danger zone" icon="warning" className="ap-span ap-danger">
      {!isOwner ? (
        <p className="sx-muted">Only the hospital owner (the account that set up Queue Mitra) can erase everything and start again.</p>
      ) : (
        <form onSubmit={reset} className="sx-form" noValidate>
          <div>
            <strong>Erase everything and start again</strong>
            <p className="sx-small sx-muted" style={{ marginTop: 2, maxWidth: '70ch' }}>
              Permanently deletes this hospital, its departments, doctors, staff accounts, every token and every report. Everyone is signed out and the app goes back to the first-time setup. This cannot be undone.
            </p>
          </div>
          <div style={{ maxWidth: 360 }}>
            <TextField
              label={
                <>
                  Type the hospital code <span className="ap-code">{code}</span> to confirm
                </>
              }
              value={typed}
              onChange={(e) => setTyped(e.target.value.toUpperCase())}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="sx-row">
            <Button type="submit" variant="danger-solid" icon="trash" busy={busy} disabled={!match}>
              Erase everything
            </Button>
            {match && <Chip tone="red">This cannot be undone</Chip>}
          </div>
          <InlineError error={error} />
        </form>
      )}
    </Card>
  )
}

export default function HospitalSettings() {
  useEffect(() => {
    document.title = 'Settings · Queue Mitra'
  }, [])
  return (
    <StaffShell>
      <PageHeader title="Settings" subtitle="Hospital details, the counter PIN, demo controls and reset." />
      <div className="ap-settings">
        <DetailsCard />
        <PinCard />
        <LinksCard />
        <DemoCard />
        <DangerCard />
      </div>
    </StaffShell>
  )
}
