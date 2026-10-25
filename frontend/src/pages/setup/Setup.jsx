import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client.js'
import { setHospitalCode } from '../../config.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useHospital } from '../../context/Hospital.jsx'
import { navigate } from '../../router.jsx'
import { Icon } from '../../components/common/Icons.jsx'
import {
  Button,
  Chip,
  InlineError,
  Notice,
  PasswordField,
  SelectField,
  Skeleton,
  StaffUIProvider,
  TextField,
  deptIcon,
  errorText,
} from '../../components/staff/ui.jsx'
import './setup.css'

const STEPS = ['Hospital', 'Your account', 'Departments', 'Doctors', 'Done']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SKIP_WORDS = new Set(['of', 'the', 'and', '&', 'for'])

/** "City District Hospital" → "CDH". 3-5 capital letters. */
export function suggestCode(name = '') {
  const words = name
    .replace(/[^A-Za-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !SKIP_WORDS.has(w.toLowerCase()))
  let code = words.map((w) => w[0]).join('').toUpperCase().slice(0, 5)
  if (code.length < 3) code = (code + words.join('').toUpperCase().slice(code.length ? 1 : 0)).slice(0, 3)
  return code.length >= 3 ? code : ''
}

function strength(pw = '') {
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++
  else if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) s += 0.5
  return Math.min(4, Math.max(pw ? 1 : 0, Math.floor(s)))
}
const STRENGTH_WORD = ['', 'Weak', 'Fair', 'Good', 'Strong']

function Progress({ step }) {
  return (
    <ol className="su-steps" aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>
      {STEPS.map((label, i) => (
        <li key={label} className="su-step" data-state={i < step ? 'done' : i === step ? 'current' : 'todo'} aria-current={i === step ? 'step' : undefined}>
          <span className="su-step__bar" aria-hidden="true" />
          <span className="su-step__label">
            <span className="su-step__num" aria-hidden="true">
              {i < step ? <Icon name="check" size={12} /> : i + 1}
            </span>
            <span className="su-step__text">{label}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

function StepCard({ icon, title, subtitle, children, footer }) {
  return (
    <section className="su-card" aria-labelledby="su-step-title">
      <header className="su-card__head">
        <h2 id="su-step-title">
          <Icon name={icon} size={22} />
          {title}
        </h2>
        {subtitle && <p>{subtitle}</p>}
      </header>
      <div className="su-card__body">{children}</div>
      {footer && <footer className="su-card__foot">{footer}</footer>}
    </section>
  )
}

/* ---------------- Step 1: hospital ---------------- */
function HospitalStep({ data, setData, onNext }) {
  const [errors, setErrors] = useState({})
  const [codeTouched, setCodeTouched] = useState(Boolean(data.code))
  const set = (k) => (e) => setData((d) => ({ ...d, [k]: e.target.value }))

  useEffect(() => {
    if (!codeTouched) setData((d) => ({ ...d, code: suggestCode(d.name) }))
  }, [data.name, codeTouched, setData])

  const submit = (e) => {
    e.preventDefault()
    const err = {}
    if (data.name.trim().length < 3) err.name = 'Enter the hospital name (at least 3 letters).'
    if (!/^[A-Z]{3,5}$/.test(data.code)) err.code = 'Use 3 to 5 capital letters, for example CDH.'
    if (data.phone && !/^[0-9+\-\s]{6,15}$/.test(data.phone)) err.phone = 'Enter digits only, for example 040 2345 6789.'
    if (!/^\d{4,6}$/.test(data.pin)) err.pin = 'The PIN must be 4 to 6 digits.'
    else if (data.pin !== data.pin2) err.pin2 = 'The two PINs do not match.'
    setErrors(err)
    if (Object.keys(err).length) {
      document.getElementById(`su-${Object.keys(err)[0]}`)?.focus()
      return
    }
    onNext()
  }

  return (
    <form onSubmit={submit} noValidate>
      <StepCard
        icon="hospital-building"
        title="Tell us about your hospital"
        subtitle="This name appears on patient phones, printed slips and the waiting-room TV."
        footer={
          <div className="sx-row">
            <Button type="submit" variant="primary" size="lg" iconRight="arrow-right">
              Next: your account
            </Button>
          </div>
        }
      >
        <TextField id="su-name" label="Hospital name" placeholder="e.g. City District Hospital" value={data.name} onChange={set('name')} error={errors.name} autoComplete="organization" autoFocus />
        <div className="sx-form-grid">
          <TextField id="su-city" label="City" optional value={data.city} onChange={set('city')} placeholder="e.g. Warangal" />
          <TextField id="su-state" label="State" optional value={data.state} onChange={set('state')} placeholder="e.g. Telangana" />
          <TextField id="su-phone" label="Hospital phone" optional value={data.phone} onChange={set('phone')} error={errors.phone} inputMode="tel" placeholder="e.g. 0870 245 6789" />
        </div>
        <TextField
          id="su-code"
          label="Hospital code"
          hint="Short code used in links and on the TV board. We suggested one from the name — you can change it."
          value={data.code}
          error={errors.code}
          maxLength={5}
          onChange={(e) => {
            setCodeTouched(true)
            setData((d) => ({ ...d, code: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') }))
          }}
          style={{ maxWidth: 180, letterSpacing: '0.12em', fontWeight: 700 }}
        />
        <div>
          <p className="su-section-title">Counter PIN</p>
          <p className="sx-muted sx-small" style={{ marginTop: 4 }}>
            Registration-counter staff sign in with this PIN. Share it only with your staff.
          </p>
        </div>
        <div className="sx-form-grid">
          <PasswordField id="su-pin" label="Staff PIN (4–6 digits)" inputMode="numeric" maxLength={6} value={data.pin} error={errors.pin} onChange={(e) => setData((d) => ({ ...d, pin: e.target.value.replace(/\D/g, '') }))} autoComplete="new-password" />
          <PasswordField id="su-pin2" label="Type the PIN again" inputMode="numeric" maxLength={6} value={data.pin2} error={errors.pin2} onChange={(e) => setData((d) => ({ ...d, pin2: e.target.value.replace(/\D/g, '') }))} autoComplete="new-password" />
        </div>
      </StepCard>
    </form>
  )
}

/* ---------------- Step 2: admin account → creates the hospital ---------------- */
function AccountStep({ hospital, data, setData, onBack, onCreated }) {
  const { startSession } = useAuth()
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState(null)
  const set = (k) => (e) => setData((d) => ({ ...d, [k]: e.target.value }))
  const score = strength(data.password)

  const submit = async (e) => {
    e.preventDefault()
    const err = {}
    if (data.name.trim().length < 2) err.name = 'Enter your full name.'
    if (!EMAIL_RE.test(data.email.trim())) err.email = 'Enter a valid email address, for example name@hospital.in.'
    if (data.password.length < 8) err.password = 'Use at least 8 characters.'
    setErrors(err)
    if (Object.keys(err).length) {
      document.getElementById(`su-a-${Object.keys(err)[0]}`)?.focus()
      return
    }
    setBusy(true)
    setServerError(null)
    try {
      const res = await api.setup({
        hospital: { name: hospital.name.trim(), code: hospital.code, city: hospital.city.trim() || undefined, state: hospital.state.trim() || undefined, phone: hospital.phone.trim() || undefined },
        admin: { name: data.name.trim(), email: data.email.trim().toLowerCase(), password: data.password },
        staffPin: hospital.pin,
      })
      setHospitalCode(res.hospital?.code || hospital.code)
      startSession(res)
      onCreated(res)
    } catch (error) {
      setServerError(error.status === 409 ? new Error('This hospital is already set up. Please sign in instead.') : error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <StepCard
        icon="shield"
        title="Create your admin account"
        subtitle="You will use this to sign in to the staff console. You can add more staff later."
        footer={
          <>
            <Button icon="arrow-left" onClick={onBack} disabled={busy}>
              Back
            </Button>
            <div className="sx-row">
              <Button type="submit" variant="primary" size="lg" busy={busy} iconRight="arrow-right">
                {busy ? 'Creating hospital…' : 'Create hospital'}
              </Button>
            </div>
          </>
        }
      >
        <div className="sx-form-grid">
          <TextField id="su-a-name" label="Your full name" value={data.name} onChange={set('name')} error={errors.name} autoComplete="name" autoFocus />
          <TextField id="su-a-email" label="Work email" type="email" value={data.email} onChange={set('email')} error={errors.email} autoComplete="email" placeholder="name@hospital.in" />
        </div>
        <div className="sx-field">
          <PasswordField id="su-a-password" label="Password" value={data.password} onChange={set('password')} error={errors.password} hint="At least 8 characters. A longer password with numbers and symbols is stronger." autoComplete="new-password" />
          {data.password && (
            <div className="sx-row" style={{ flexWrap: 'nowrap' }} aria-live="polite">
              <div className="sx-strength" data-score={score} style={{ flex: 1 }} aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
              <span className="sx-small sx-muted" style={{ minWidth: 60 }}>
                {STRENGTH_WORD[score]}
              </span>
            </div>
          )}
        </div>
        <Notice icon="lock">
          Creating <strong>{hospital.name}</strong> ({hospital.code}). The next steps add departments and doctors — you can also do that later from the console.
        </Notice>
        <InlineError error={serverError} />
      </StepCard>
    </form>
  )
}

/* ---------------- Step 3: departments ---------------- */
function DepartmentsStep({ catalog, catalogError, reloadCatalog, picks, setPicks, customs, setCustoms, created, setCreated, onNext }) {
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [draft, setDraft] = useState({ name: '', room: '', seats: 20, minutes: 8 })
  const [draftError, setDraftError] = useState({})
  const rooms = catalog?.rooms || []

  const toggle = (d) =>
    setPicks((p) => {
      if (created[d.code]) return p // already created: keep it
      const next = { ...p }
      if (next[d.code]) delete next[d.code]
      else next[d.code] = { room: d.suggestedRoom || rooms[0]?.name || 'Room 1', seats: d.seatingCapacity || 20, minutes: d.avgConsultMinutes || 8 }
      return next
    })
  const update = (code, k, v) => setPicks((p) => ({ ...p, [code]: { ...p[code], [k]: v } }))

  const roomUse = useMemo(() => {
    const use = {}
    Object.entries(picks).forEach(([code, v]) => (use[v.room] ||= []).push(code))
    customs.forEach((c) => (use[c.room] ||= []).push(c.code))
    return use
  }, [picks, customs])

  const addCustom = () => {
    const err = {}
    const name = draft.name.trim()
    if (name.length < 3) err.name = 'Enter a department name.'
    const all = [...(catalog?.departments || []).map((d) => d.code), ...customs.map((c) => c.code)]
    let code = suggestCode(name).slice(0, 3) || 'DEP'
    let n = 2
    while (all.includes(code)) code = `${code.slice(0, 2)}${n++}`
    if (!draft.room) err.room = 'Pick a room.'
    setDraftError(err)
    if (Object.keys(err).length) return
    setCustoms((c) => [...c, { code, name, room: draft.room, seats: Number(draft.seats) || 20, minutes: Number(draft.minutes) || 8 }])
    setDraft({ name: '', room: '', seats: 20, minutes: 8 })
  }

  const total = Object.keys(picks).length + customs.length

  const submit = async () => {
    if (!total) {
      setFormError('Pick at least one department, or choose “Skip for now”.')
      return
    }
    const err = {}
    for (const [code, v] of Object.entries(picks)) {
      if (!(Number(v.seats) > 0)) err[code] = 'Seats must be 1 or more.'
      else if (!(Number(v.minutes) > 0)) err[code] = 'Minutes must be 1 or more.'
    }
    setErrors(err)
    if (Object.keys(err).length) return
    setBusy(true)
    setFormError(null)
    const done = { ...created }
    const failed = {}
    const catalogByCode = Object.fromEntries((catalog?.departments || []).map((d) => [d.code, d]))
    const jobs = [
      ...Object.entries(picks).map(([code, v]) => ({ code, name: catalogByCode[code]?.name, description: catalogByCode[code]?.description, ...v })),
      ...customs,
    ]
    for (const j of jobs) {
      if (done[j.code]) continue
      const roomInfo = rooms.find((r) => r.name === j.room)
      try {
        const res = await api.createDepartment({
          code: j.code,
          name: j.name,
          description: j.description,
          rooms: [j.room],
          floor: roomInfo?.floor ?? catalogByCode[j.code]?.floor ?? 1,
          seatingCapacity: Number(j.seats),
          avgConsultMinutes: Number(j.minutes),
        })
        done[j.code] = res.department || { code: j.code, name: j.name, rooms: [j.room] }
      } catch (e) {
        if (e.status === 409) done[j.code] = { code: j.code, name: j.name, rooms: [j.room] }
        else failed[j.code] = errorText(e)
      }
    }
    setCreated(done)
    setErrors(failed)
    setBusy(false)
    if (Object.keys(failed).length) setFormError('Some departments could not be added. Check the messages below and try again.')
    else onNext()
  }

  return (
    <StepCard
      icon="layers"
      title="Which OPD departments run here?"
      subtitle="Pick the departments patients can register for. Set the room, waiting-area seats and the usual minutes per patient — the wait estimate starts from this."
      footer={
        <>
          <span className="sx-small sx-muted">Hospital created. You can change departments any time.</span>
          <div className="sx-row">
            <Button variant="ghost" onClick={() => onNext(true)} disabled={busy}>
              Skip for now
            </Button>
            <Button variant="primary" size="lg" busy={busy} iconRight="arrow-right" onClick={submit}>
              {busy ? 'Adding departments…' : total ? `Add ${total} department${total > 1 ? 's' : ''}` : 'Next: doctors'}
            </Button>
          </div>
        </>
      }
    >
      {!catalog && !catalogError && (
        <div className="su-depts">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} height={84} style={{ borderRadius: 12 }} />
          ))}
        </div>
      )}
      {catalogError && <InlineError error={catalogError} onRetry={reloadCatalog} />}
      {catalog && (
        <div className="su-depts">
          {catalog.departments.map((d) => {
            const on = Boolean(picks[d.code])
            const v = picks[d.code]
            const shared = v && roomUse[v.room]?.length > 1
            return (
              <div key={d.code} className="su-dept" data-on={on}>
                <button type="button" className="su-dept__toggle" aria-pressed={on} onClick={() => toggle(d)}>
                  <span className="su-dept__icon" aria-hidden="true">
                    <Icon name={deptIcon(d)} size={22} />
                  </span>
                  <span>
                    <span className="su-dept__name">{d.name}</span>
                    <span className="su-dept__desc">{d.description}</span>
                  </span>
                  <span className="su-dept__check" aria-hidden="true">
                    {on && <Icon name="check" size={14} />}
                  </span>
                </button>
                {on && (
                  <>
                    <div className="su-dept__fields">
                      <SelectField label="Room" value={v.room} onChange={(e) => update(d.code, 'room', e.target.value)} disabled={Boolean(created[d.code])}>
                        {rooms.map((r) => (
                          <option key={r.id || r.name} value={r.name}>
                            {r.name}
                            {r.floor !== undefined ? ` · floor ${r.floor}` : ''}
                          </option>
                        ))}
                      </SelectField>
                      <TextField label="Seats" type="number" min={1} value={v.seats} onChange={(e) => update(d.code, 'seats', e.target.value)} disabled={Boolean(created[d.code])} />
                      <TextField label="Minutes" title="Usual minutes per patient" type="number" min={1} value={v.minutes} onChange={(e) => update(d.code, 'minutes', e.target.value)} disabled={Boolean(created[d.code])} />
                    </div>
                    {(created[d.code] || errors[d.code] || shared) && (
                      <p className="su-dept__status">
                        {created[d.code] ? (
                          <Chip tone="green" icon="check">
                            Added
                          </Chip>
                        ) : errors[d.code] ? (
                          <span className="sx-field__error">{errors[d.code]}</span>
                        ) : (
                          <span className="sx-muted">{v.room} is shared with another department.</span>
                        )}
                      </p>
                    )}
                  </>
                )}
              </div>
            )
          })}
          {customs.map((c) => (
            <div key={c.code} className="su-dept" data-on="true">
              <div className="su-dept__toggle" style={{ cursor: 'default' }}>
                <span className="su-dept__icon" aria-hidden="true">
                  <Icon name="stethoscope" size={22} />
                </span>
                <span>
                  <span className="su-dept__name">{c.name}</span>
                  <span className="su-dept__desc">
                    Custom · code {c.code} · {c.room} · {c.seats} seats · {c.minutes} min
                  </span>
                </span>
                {created[c.code] ? (
                  <Chip tone="green" icon="check">
                    Added
                  </Chip>
                ) : (
                  <Button variant="ghost" size="sm" icon="trash" aria-label={`Remove ${c.name}`} onClick={() => setCustoms((all) => all.filter((x) => x.code !== c.code))} />
                )}
              </div>
              {errors[c.code] && <p className="su-dept__status sx-field__error">{errors[c.code]}</p>}
            </div>
          ))}
        </div>
      )}

      {catalog && (
        <div className="su-custom">
          <p className="su-section-title">Add a custom department</p>
          <div className="sx-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))' }}>
            <TextField label="Department name" placeholder="e.g. Dental" value={draft.name} error={draftError.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
            <SelectField label="Room" value={draft.room} error={draftError.room} onChange={(e) => setDraft((d) => ({ ...d, room: e.target.value }))}>
              <option value="">Choose a room</option>
              {rooms.map((r) => (
                <option key={r.id || r.name} value={r.name}>
                  {r.name}
                </option>
              ))}
            </SelectField>
            <TextField label="Seats" type="number" min={1} value={draft.seats} onChange={(e) => setDraft((d) => ({ ...d, seats: e.target.value }))} />
            <TextField label="Min / patient" type="number" min={1} value={draft.minutes} onChange={(e) => setDraft((d) => ({ ...d, minutes: e.target.value }))} />
          </div>
          <div>
            <Button icon="plus" onClick={addCustom}>
              Add department
            </Button>
          </div>
        </div>
      )}
      {formError && <InlineError>{formError}</InlineError>}
    </StepCard>
  )
}

/* ---------------- Step 4: doctors ---------------- */
const blankDoctor = () => ({ key: Math.random().toString(36).slice(2), name: '', email: '', password: '', departmentCode: '', room: '' })

function DoctorsStep({ departments, doctors, setDoctors, createdDoctors, setCreatedDoctors, onBack, onNext }) {
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const list = Object.values(departments)

  const update = (key, k, v) =>
    setDoctors((all) =>
      all.map((d) => {
        if (d.key !== key) return d
        const next = { ...d, [k]: v }
        if (k === 'departmentCode') next.room = list.find((x) => x.code === v)?.rooms?.[0] || ''
        return next
      })
    )

  const submit = async () => {
    const rows = doctors.filter((d) => !createdDoctors[d.key] && (d.name || d.email || d.password))
    const err = {}
    rows.forEach((d) => {
      const e = {}
      if (d.name.trim().length < 2) e.name = 'Enter the doctor’s name.'
      if (!EMAIL_RE.test(d.email.trim())) e.email = 'Enter a valid email.'
      if (d.password.length < 8) e.password = 'At least 8 characters.'
      if (!d.departmentCode) e.departmentCode = 'Pick a department.'
      if (Object.keys(e).length) err[d.key] = e
    })
    setErrors(err)
    if (Object.keys(err).length) return
    setBusy(true)
    setFormError(null)
    const done = { ...createdDoctors }
    const failed = {}
    for (const d of rows) {
      try {
        await api.createDoctor({ name: d.name.trim(), email: d.email.trim().toLowerCase(), password: d.password, departmentCode: d.departmentCode, room: d.room })
        done[d.key] = true
      } catch (e) {
        failed[d.key] = { form: errorText(e) }
      }
    }
    setCreatedDoctors(done)
    setErrors(failed)
    setBusy(false)
    if (Object.keys(failed).length) setFormError('Some doctors could not be added. Check the messages below.')
    else onNext()
  }

  const pending = doctors.filter((d) => !createdDoctors[d.key] && (d.name || d.email)).length

  return (
    <StepCard
      icon="doctor"
      title="Add doctors (optional)"
      subtitle="Each doctor signs in to their own room console to call patients. Give them a temporary password — they can be added or changed later under People."
      footer={
        <>
          <Button icon="arrow-left" onClick={onBack} disabled={busy}>
            Back
          </Button>
          <div className="sx-row">
            <Button variant="ghost" onClick={onNext} disabled={busy}>
              Skip for now
            </Button>
            <Button variant="primary" size="lg" busy={busy} iconRight="arrow-right" onClick={submit} disabled={!list.length}>
              {busy ? 'Adding doctors…' : pending ? `Add ${pending} doctor${pending > 1 ? 's' : ''} and finish` : 'Finish'}
            </Button>
          </div>
        </>
      }
    >
      {!list.length ? (
        <Notice tone="warn" icon="warning">
          Add a department first — every doctor belongs to a department. You can skip this and add doctors later under People.
        </Notice>
      ) : (
        <>
          {doctors.map((d, i) => {
            const e = errors[d.key] || {}
            const dept = list.find((x) => x.code === d.departmentCode)
            return (
              <div key={d.key} className="su-doctor">
                <div className="sx-between">
                  <strong>Doctor {i + 1}</strong>
                  {createdDoctors[d.key] ? (
                    <Chip tone="green" icon="check">
                      Added
                    </Chip>
                  ) : (
                    doctors.length > 1 && (
                      <Button variant="ghost" size="sm" icon="trash" onClick={() => setDoctors((all) => all.filter((x) => x.key !== d.key))}>
                        Remove
                      </Button>
                    )
                  )}
                </div>
                <fieldset disabled={Boolean(createdDoctors[d.key])} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                  <div className="sx-form-grid">
                    <TextField label="Name" placeholder="e.g. Dr. Meera Rao" value={d.name} error={e.name} onChange={(ev) => update(d.key, 'name', ev.target.value)} />
                    <TextField label="Email (used to sign in)" type="email" value={d.email} error={e.email} onChange={(ev) => update(d.key, 'email', ev.target.value)} autoComplete="off" />
                    <PasswordField label="Temporary password" value={d.password} error={e.password} onChange={(ev) => update(d.key, 'password', ev.target.value)} autoComplete="new-password" />
                    <SelectField label="Department" value={d.departmentCode} error={e.departmentCode} onChange={(ev) => update(d.key, 'departmentCode', ev.target.value)}>
                      <option value="">Choose</option>
                      {list.map((x) => (
                        <option key={x.code} value={x.code}>
                          {x.name}
                        </option>
                      ))}
                    </SelectField>
                    <SelectField label="Room" value={d.room} onChange={(ev) => update(d.key, 'room', ev.target.value)} disabled={!dept}>
                      {(dept?.rooms || []).map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </SelectField>
                  </div>
                </fieldset>
                {e.form && <InlineError>{e.form}</InlineError>}
              </div>
            )
          })}
          <div>
            <Button icon="plus" onClick={() => setDoctors((all) => [...all, blankDoctor()])}>
              Add another doctor
            </Button>
          </div>
        </>
      )}
      {formError && <InlineError>{formError}</InlineError>}
    </StepCard>
  )
}

/* ---------------- Step 5: done ---------------- */
function DoneStep({ hospital, departments, doctorCount }) {
  const { refresh } = useHospital()
  const [going, setGoing] = useState(false)
  const go = async (to) => {
    setGoing(true)
    await refresh()
    navigate(to, { replace: true })
  }
  const deptCount = Object.keys(departments).length
  return (
    <section className="su-card">
      <div className="su-done">
        <span className="su-done__mark" aria-hidden="true">
          <Icon name="check" size={32} />
        </span>
        <h2>{hospital.name} is ready</h2>
        <p>Queue Mitra is live. Patients can register on their phones, staff can run the queues, and the TV board will call tokens aloud.</p>
      </div>
      <div className="su-card__body">
        <div className="su-summary">
          <div>
            <span>Hospital code</span>
            <strong>{hospital.code}</strong>
          </div>
          <div>
            <span>Departments</span>
            <strong>{deptCount}</strong>
          </div>
          <div>
            <span>Doctors</span>
            <strong>{doctorCount}</strong>
          </div>
          <div>
            <span>Counter PIN</span>
            <strong>{'•'.repeat(hospital.pin.length)}</strong>
          </div>
        </div>
        <div>
          <p className="su-section-title" style={{ marginBottom: 8 }}>
            Next steps
          </p>
          <ol className="su-next">
            {!deptCount && <li>Add your OPD departments under Departments — patients can only register once one exists.</li>}
            {!doctorCount && <li>Add doctors under People so each room can call its patients.</li>}
            <li>Open the TV board on the waiting-hall screen and tap “Turn on announcements”.</li>
            <li>Put the patient app link (or a QR code to it) at the gate so patients can register on their phones.</li>
            <li>Keep the queue console open at the help desk — urgent help requests appear there with a sound.</li>
          </ol>
        </div>
        <div className="su-links">
          <button type="button" className="su-link su-link--primary" onClick={() => go('/admin/queues')} disabled={going}>
            <strong>
              <Icon name="queue" size={18} /> Go to the queue console
            </strong>
            <span>Call patients and watch every department live.</span>
          </button>
          <a className="su-link" href="/" target="_blank" rel="noreferrer">
            <strong>
              <Icon name="phone" size={18} /> Open patient app <Icon name="external" size={14} />
            </strong>
            <span>What patients see on their phone. Opens in a new tab.</span>
          </a>
          <a className="su-link" href="/board" target="_blank" rel="noreferrer">
            <strong>
              <Icon name="tv" size={18} /> Open TV board <Icon name="external" size={14} />
            </strong>
            <span>For the waiting-hall screen. Opens in a new tab.</span>
          </a>
          <button type="button" className="su-link" onClick={() => go('/admin')} disabled={going}>
            <strong>
              <Icon name="dashboard" size={18} /> Hospital overview
            </strong>
            <span>Today’s totals and the getting-started checklist.</span>
          </button>
        </div>
      </div>
    </section>
  )
}

/* ---------------- Wizard ---------------- */
export default function Setup() {
  const [step, setStep] = useState(0)
  const [hospital, setHospital] = useState({ name: '', city: '', state: '', phone: '', code: '', pin: '', pin2: '' })
  const [account, setAccount] = useState({ name: '', email: '', password: '' })
  const [created, setCreated] = useState(null) // hospital created on the server (after step 2)
  const [catalog, setCatalog] = useState(null)
  const [catalogError, setCatalogError] = useState(null)
  const [picks, setPicks] = useState({})
  const [customs, setCustoms] = useState([])
  const [createdDepts, setCreatedDepts] = useState({})
  const [doctors, setDoctors] = useState([blankDoctor()])
  const [createdDoctors, setCreatedDoctors] = useState({})

  const loadCatalog = () => {
    setCatalogError(null)
    api
      .setupCatalog()
      .then(setCatalog)
      .catch(setCatalogError)
  }
  useEffect(loadCatalog, [])

  useEffect(() => {
    document.title = 'Set up your hospital · Queue Mitra'
    document.getElementById('su-step-title')?.focus?.()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  // Steps 1-2 can't be revisited once the hospital exists (it would be created twice).
  const back = (to) => setStep(created && to < 2 ? 2 : to)

  return (
    <StaffUIProvider>
      <div className="sx su">
        <header className="su-top">
          <div className="sx-brand">
            <span className="sx-brand__mark" aria-hidden="true">
              <Icon name="queue" size={20} />
            </span>
            <span className="sx-brand__text">
              <span className="sx-brand__name">Queue Mitra</span>
              <span className="sx-brand__hospital">First-time setup</span>
            </span>
          </div>
          <span className="sx-small sx-muted">
            Step {step + 1} of {STEPS.length}
          </span>
        </header>
        <main className="su-wrap">
          {step === 0 && (
            <div className="su-intro">
              <h1>Set up your hospital in a few minutes</h1>
              <p>Queue Mitra gives patients a token on their phone, shows them the way to the right room, and gives your staff one live screen for every OPD queue.</p>
            </div>
          )}
          <Progress step={step} />
          {step === 0 && <HospitalStep data={hospital} setData={setHospital} onNext={() => setStep(1)} />}
          {step === 1 && <AccountStep hospital={hospital} data={account} setData={setAccount} onBack={() => back(0)} onCreated={(res) => (setCreated(res), setStep(2))} />}
          {step === 2 && (
            <DepartmentsStep
              catalog={catalog}
              catalogError={catalogError}
              reloadCatalog={loadCatalog}
              picks={picks}
              setPicks={setPicks}
              customs={customs}
              setCustoms={setCustoms}
              created={createdDepts}
              setCreated={setCreatedDepts}
              onNext={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <DoctorsStep
              departments={createdDepts}
              doctors={doctors}
              setDoctors={setDoctors}
              createdDoctors={createdDoctors}
              setCreatedDoctors={setCreatedDoctors}
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
            />
          )}
          {step === 4 && <DoneStep hospital={{ ...hospital, code: created?.hospital?.code || hospital.code, name: created?.hospital?.name || hospital.name }} departments={createdDepts} doctorCount={Object.keys(createdDoctors).length} />}
        </main>
      </div>
    </StaffUIProvider>
  )
}
