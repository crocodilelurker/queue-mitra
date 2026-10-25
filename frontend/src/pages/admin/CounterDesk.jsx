import { useState } from 'react'
import { api } from '../../api/client.js'
import { navigate } from '../../router.jsx'
import { Icon } from '../../components/common/Icons.jsx'
import QrCode from '../../components/common/QrCode.jsx'
import StaffShell, { useStaffLive } from '../../components/staff/StaffShell.jsx'
import { Button, Card, EmptyState, InlineError, PageHeader, SelectField, TextField, aboutWait, deptIcon, useToast } from '../../components/staff/ui.jsx'
import './console.css'

const blank = { firstName: '', age: '', gender: '', mobile: '', departmentCode: '', language: 'hi', assisted: true }

function Slip({ slip, onNext }) {
  const url = `${window.location.origin}/my-turn/${slip.publicId}`
  return (
    <Card
      title="Slip ready"
      icon="ticket"
      footer={
        <>
          <Button icon="print" onClick={() => window.print()}>
            Print slip
          </Button>
          <Button variant="primary" icon="user-plus" onClick={onNext} autoFocus>
            Register next patient
          </Button>
        </>
      }
    >
      <div className="qc-slip">
        <strong>{slip.hospital?.name}</strong>
        <span className="sx-small sx-muted">OPD token — show this at the room door</span>
        <div className="qc-slip__token">{slip.tokenNumber}</div>
        <dl>
          <dt>Name</dt>
          <dd>{slip.patient?.firstName}</dd>
          <dt>Department</dt>
          <dd>{slip.department?.name}</dd>
          <dt>Room</dt>
          <dd>
            {slip.room} · Floor {slip.department?.floor ?? 1}
          </dd>
          <dt>Doctor</dt>
          <dd>{slip.doctorName || '—'}</dd>
          <dt>People ahead</dt>
          <dd>{slip.peopleAhead ?? 0}</dd>
          <dt>Estimated wait</dt>
          <dd>{aboutWait(slip.estimatedWaitMinutes)}</dd>
        </dl>
        <QrCode value={url} label={`QR code for token ${slip.tokenNumber}`} />
        <span className="sx-small sx-muted">Scan to see your place in the queue. Emergency? Go to Casualty, Ground Floor — no token needed. Call 112 / 108.</span>
      </div>
    </Card>
  )
}

function Counter() {
  const live = useStaffLive()
  const toast = useToast()
  const [f, setF] = useState(blank)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [slip, setSlip] = useState(null)
  const departments = live.overview?.departments || []
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const err = {}
    if (!f.firstName.trim()) err.firstName = 'Enter the first name.'
    if (!/^\d{1,3}$/.test(f.age) || Number(f.age) > 120) err.age = 'Enter age in years.'
    if (!f.gender) err.gender = 'Choose one.'
    if (f.mobile && !/^\d{10}$/.test(f.mobile)) err.mobile = 'Enter 10 digits, or leave empty.'
    if (!f.departmentCode) err.departmentCode = 'Choose a department.'
    setErrors(err)
    if (Object.keys(err).length) return
    setBusy(true)
    setError(null)
    try {
      const res = await api.counterRegister({ firstName: f.firstName.trim(), age: Number(f.age), gender: f.gender, mobile: f.mobile || undefined, departmentCode: f.departmentCode, language: f.language, isAssisted: f.assisted })
      setSlip(res.slip || res)
      toast(`Token ${(res.slip || res).tokenNumber} created`)
      live.refresh()
    } catch (e2) {
      setError(e2)
    } finally {
      setBusy(false)
    }
  }

  if (slip)
    return (
      <Slip
        slip={slip}
        onNext={() => {
          setSlip(null)
          setF(blank)
        }}
      />
    )

  if (live.overview && !departments.length)
    return (
      <div className="sx-card">
        <EmptyState icon="layers" title="No departments yet" action={<Button variant="primary" icon="plus" onClick={() => navigate('/admin/departments')}>Add a department</Button>}>
          Patients can be registered once an OPD department is set up.
        </EmptyState>
      </div>
    )

  return (
    <form onSubmit={submit} noValidate>
      <Card
        title="New patient"
        icon="user-plus"
        footer={
          <Button type="submit" variant="primary" size="lg" icon="ticket" busy={busy}>
            Register and make slip
          </Button>
        }
      >
        <div className="sx-form">
          <div className="sx-form-grid">
            <TextField label="First name" value={f.firstName} onChange={set('firstName')} error={errors.firstName} autoFocus autoComplete="off" />
            <TextField label="Age" inputMode="numeric" value={f.age} onChange={(e) => setF((x) => ({ ...x, age: e.target.value.replace(/\D/g, '') }))} error={errors.age} maxLength={3} />
            <SelectField label="Gender" value={f.gender} onChange={set('gender')} error={errors.gender}>
              <option value="">Choose</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </SelectField>
            <TextField label="Mobile" optional inputMode="numeric" maxLength={10} value={f.mobile} onChange={(e) => setF((x) => ({ ...x, mobile: e.target.value.replace(/\D/g, '') }))} error={errors.mobile} hint="For the 'your turn is close' SMS." />
            <SelectField label="Language" value={f.language} onChange={set('language')}>
              <option value="hi">हिन्दी Hindi</option>
              <option value="en">English</option>
              <option value="te">తెలుగు Telugu</option>
              <option value="ta">தமிழ் Tamil</option>
            </SelectField>
          </div>
          <div className="sx-field">
            <span className="sx-field__label">Department</span>
            <div className="qc-pick" role="group" aria-label="Department">
              {departments.map((d) => (
                <button key={d.code} type="button" aria-pressed={f.departmentCode === d.code} onClick={() => setF((x) => ({ ...x, departmentCode: d.code }))}>
                  <Icon name={deptIcon(d)} size={20} />
                  <span>
                    {d.name}
                    <span className="sx-small sx-muted" style={{ display: 'block', fontWeight: 500 }}>
                      {d.waitingCount ?? 0} waiting · {aboutWait(d.estimatedWaitMinutes)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            {errors.departmentCode && <span className="sx-field__error">{errors.departmentCode}</span>}
          </div>
          <label className="sx-check">
            <input type="checkbox" checked={f.assisted} onChange={(e) => setF((x) => ({ ...x, assisted: e.target.checked }))} />
            Assisted — the patient needs extra help (shown to the doctor)
          </label>
          {error && <InlineError error={error} />}
        </div>
      </Card>
    </form>
  )
}

export default function CounterDesk() {
  return (
    <StaffShell roles={['admin', 'superadmin', 'staff']}>
      <PageHeader title="Registration counter" subtitle="Register a patient who has no phone, then print their slip." />
      <Counter />
    </StaffShell>
  )
}
