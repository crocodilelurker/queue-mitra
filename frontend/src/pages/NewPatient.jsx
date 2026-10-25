import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client.js'
import { departmentIcon, useDepartments } from '../api/departments.js'
import { WarningSigns } from '../components/EmergencyParts.jsx'
import Layout from '../components/Layout.jsx'
import MicButton from '../components/MicButton.jsx'
import SymptomBox from '../components/SymptomBox.jsx'
import TriageResult from '../components/TriageResult.jsx'
import ListenButton from '../components/common/ListenButton.jsx'
import { Icon } from '../components/common/Icons.jsx'
import { ErrorNote, Loading } from '../components/common/Status.jsx'
import Toggle from '../components/common/Toggle.jsx'
import { MAX_NAME_LENGTH, validateAge, validateFirstName, validateMobile } from '../components/new/validation.js'
import { useAccess } from '../context/Access.jsx'
import { useI18n } from '../i18n/index.jsx'
import { Link, navigate, useLocation } from '../router.jsx'
import { queueOfflineRegistration, rememberTicket } from '../utils/patientStore.js'
import { speak } from '../utils/speech.js'

const DRAFT_KEY = 'qm-register-draft'
const STEPS = ['name', 'age', 'gender', 'mobile', 'dept'] // "Step n of 5"
const EMPTY = { firstName: '', age: '', gender: '', mobile: '', helperName: '', dept: '' }
const GENDERS = [
  ['female', 'genderFemale', 'woman'],
  ['male', 'genderMale', 'user'],
  ['other', 'genderOther', 'users'],
]

function loadDraft() {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT_KEY)) || null
  } catch {
    return null
  }
}

function Progress({ step }) {
  const { f } = useI18n()
  const n = STEPS.indexOf(step) + 1
  if (n < 1) return null
  const label = f('stepOf', { n, total: STEPS.length })
  return (
    <div className="progress" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={n} aria-label={label}>
      <span className="progress__label">{label}</span>
      <span className="progress__track">
        <span className="progress__fill" style={{ width: `${(n / STEPS.length) * 100}%` }} />
      </span>
    </div>
  )
}

function StepNav({ onBack, onNext, nextLabel, nextIcon = 'arrow-right', busy = false, nextDisabled = false }) {
  const { t } = useI18n()
  return (
    <div className="step-nav">
      {onNext && (
        <button type={onNext === 'submit' ? 'submit' : 'button'} className="btn btn--primary btn--block" disabled={busy || nextDisabled} onClick={onNext === 'submit' ? undefined : onNext}>
          <span>{nextLabel || t.continue}</span>
          <Icon name={nextIcon} size={22} />
        </button>
      )}
      {onBack && (
        <button type="button" className="btn btn--ghost btn--block" onClick={onBack} disabled={busy}>
          <Icon name="arrow-left" size={22} />
          <span>{t.back}</span>
        </button>
      )}
    </div>
  )
}

/** One text question with a big microphone where the browser can listen. */
function TextQuestion({ id, label, hint, value, error, onChange, onSubmit, onBack, inputProps = {}, parseSpoken = (s) => s, extra = null }) {
  const ref = useRef(null)
  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
  }, [])
  return (
    <form
      className="question"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <label className="question__label" htmlFor={id}>
        {label}
      </label>
      {hint && (
        <p className="question__hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      <input
        ref={ref}
        id={id}
        className={`field__control field__control--big${error ? ' field__control--error' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={[hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined}
        {...inputProps}
      />
      {error && (
        <p className="field__error" id={`${id}-err`} role="alert">
          <Icon name="alert" size={18} />
          <span>{error}</span>
        </p>
      )}
      <MicButton onText={(spoken) => onChange(parseSpoken(spoken))} className="btn--block" />
      {extra}
      <StepNav onNext="submit" onBack={onBack} />
    </form>
  )
}

function DepartmentCard({ dept, selected, onSelect }) {
  const { deptName, deptDesc, floorName, t } = useI18n()
  const room = dept.rooms?.[0]
  return (
    <button type="button" className={`dept-card${selected ? ' is-selected' : ''}`} aria-pressed={selected} onClick={() => onSelect(dept.code)}>
      <span className="dept-icon" aria-hidden="true">
        <Icon name={departmentIcon(dept)} size={30} />
      </span>
      <span className="dept-card__text">
        <span className="dept-card__name">{deptName(dept)}</span>
        {deptDesc(dept) && <span className="dept-card__desc">{deptDesc(dept)}</span>}
        {(room || dept.floor !== undefined) && (
          <span className="dept-card__where">
            {[room && room.replace(/^Room/i, t.room), dept.floor !== undefined && dept.floor !== null && floorName(dept.floor)].filter(Boolean).join(' · ')}
          </span>
        )}
      </span>
      {selected && <Icon name="check-circle" size={26} className="dept-card__check" />}
    </button>
  )
}

export default function NewPatient() {
  const { t, f, lang, deptName, floorName, roomName } = useI18n()
  const { prefs, setPref } = useAccess()
  const { list, byCode, loading: deptLoading, error: deptError } = useDepartments()
  const { search } = useLocation()
  const draft = loadDraft()
  const preset = new URLSearchParams(search).get('dept')

  const [step, setStep] = useState(draft?.step || 'intro')
  const [p, setP] = useState(() => ({ ...EMPTY, ...(draft?.patient || {}), ...(preset ? { dept: preset.toUpperCase() } : {}) }))
  const [errors, setErrors] = useState({})
  const [describeOpen, setDescribeOpen] = useState(false)
  const [suggestion, setSuggestion] = useState(null)
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // Keep answers if the page is reloaded (this browser tab only).
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ step, patient: p }))
    } catch {
      /* storage unavailable */
    }
  }, [step, p])

  const questions = {
    intro: t.regIntroTitle,
    name: t.qName,
    age: t.qAge,
    gender: t.qGender,
    mobile: t.qMobile,
    dept: t.qDept,
    review: t.reviewTitle,
  }

  // Read each question aloud in assisted / read-aloud mode.
  useEffect(() => {
    if (prefs.readAloud || prefs.assisted) speak(questions[step], lang)
    window.scrollTo(0, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, lang])

  const set = (field) => (value) => {
    setP((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: '' }))
  }
  const go = (next) => setStep(next)
  const check = (field, rule, next) => {
    const err = rule(p[field] ?? '')
    setErrors((e) => ({ ...e, [field]: err }))
    if (!err) go(next)
  }

  const submit = async () => {
    setBusy(true)
    setSubmitError(null)
    const payload = {
      departmentCode: p.dept,
      firstName: p.firstName.trim(),
      age: Number(p.age),
      gender: p.gender,
      mobile: p.mobile.trim() || undefined,
      language: lang,
      isAssisted: Boolean(prefs.assisted),
      helperName: prefs.assisted ? p.helperName.trim() || undefined : undefined,
      accessibility: { avoidStairs: prefs.avoidStairs, largeText: prefs.textSize > 0, readAloud: prefs.readAloud, highContrast: prefs.highContrast },
    }
    try {
      const ticket = await api.createTicket(payload)
      rememberTicket(ticket)
      sessionStorage.removeItem(DRAFT_KEY)
      navigate(`/slip/${ticket.publicId}`, { replace: true })
    } catch (err) {
      if (err.status === 0) {
        // No connection: keep the registration on this phone and send it when the connection is back.
        const tempId = queueOfflineRegistration(payload)
        sessionStorage.removeItem(DRAFT_KEY)
        navigate(`/slip/${tempId}`, { replace: true })
        return
      }
      setSubmitError(err)
      setBusy(false)
    }
  }

  const listenQuestion = <ListenButton text={questions[step]} className="btn btn--ghost btn--small" />

  // ---------- Hospital has no departments yet ----------
  if (!deptLoading && !deptError && list.length === 0) {
    return (
      <Layout>
        <section className="empty-state">
          <Icon name="clipboard" size={48} />
          <h1 className="page-title">{t.regSoonTitle}</h1>
          <p className="lead">{t.regSoonBody}</p>
          <Link className="btn btn--primary btn--block" to="/map?to=reg_counters_0">
            <Icon name="compass" size={22} />
            <span>{t.showWayCounter}</span>
          </Link>
          <Link className="btn btn--ghost btn--block" to="/">
            <Icon name="home" size={22} />
            <span>{t.backHome}</span>
          </Link>
        </section>
      </Layout>
    )
  }

  let body
  if (step === 'intro') {
    body = (
      <>
        <h1 className="page-title">{t.regIntroTitle}</h1>
        <div className="emergency-first">
          <WarningSigns />
          <Link className="btn btn--danger btn--block" to="/emergency">
            <Icon name="emergency" size={22} />
            <span>{t.goEmergencyNow}</span>
          </Link>
        </div>
        <p className="explain">
          <Icon name="help" size={22} />
          <span>{t.opdExplain}</span>
        </p>
        <div className="card">
          <Toggle iconName="users" label={t.assisted} hint={t.assistedHint} checked={prefs.assisted} onChange={(on) => setPref('assisted', on)} />
          {prefs.assisted && (
            <div className="field mt-2">
              <label className="field__label" htmlFor="helper">
                {t.helperName}
              </label>
              <input id="helper" className="field__control" value={p.helperName} maxLength={50} autoComplete="off" onChange={(e) => set('helperName')(e.target.value)} />
            </div>
          )}
        </div>
        {deptLoading && !list.length ? <Loading /> : <ErrorNote error={deptError} onRetry={() => window.location.reload()} />}
        <StepNav onNext={() => go('name')} nextLabel={t.startRegister} />
      </>
    )
  } else if (step === 'name') {
    body = (
      <TextQuestion
        id="q-name"
        label={t.qName}
        hint={t.qNameHint}
        value={p.firstName}
        error={errors.firstName && t[errors.firstName]}
        onChange={set('firstName')}
        onSubmit={() => check('firstName', validateFirstName, 'age')}
        onBack={() => go('intro')}
        inputProps={{ autoComplete: 'given-name', maxLength: MAX_NAME_LENGTH + 10 }}
      />
    )
  } else if (step === 'age') {
    body = (
      <TextQuestion
        id="q-age"
        label={t.qAge}
        hint={t.qAgeHint}
        value={p.age}
        error={errors.age && t[errors.age]}
        onChange={(v) => set('age')(String(v).replace(/[^\d]/g, '').slice(0, 3))}
        parseSpoken={(s) => (s.match(/\d+/) || [''])[0]}
        onSubmit={() => check('age', validateAge, 'gender')}
        onBack={() => go('name')}
        inputProps={{ inputMode: 'numeric', autoComplete: 'off', maxLength: 3 }}
      />
    )
  } else if (step === 'gender') {
    body = (
      <fieldset className="question">
        <legend className="question__label">{t.qGender}</legend>
        <div className="choice-list">
          {GENDERS.map(([value, key, icon]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={p.gender === value}
              className={`choice-btn${p.gender === value ? ' is-selected' : ''}`}
              onClick={() => {
                set('gender')(value)
                go('mobile')
              }}
            >
              <Icon name={icon} size={28} />
              <span>{t[key]}</span>
              {p.gender === value && <Icon name="check-circle" size={24} className="choice-btn__check" />}
            </button>
          ))}
        </div>
        <StepNav onBack={() => go('age')} />
      </fieldset>
    )
  } else if (step === 'mobile') {
    body = (
      <TextQuestion
        id="q-mobile"
        label={t.qMobile}
        hint={t.qMobileHint}
        value={p.mobile}
        error={errors.mobile && t[errors.mobile]}
        onChange={(v) => set('mobile')(String(v).replace(/[^\d]/g, '').slice(-10))}
        parseSpoken={(s) => s.replace(/[^\d]/g, '')}
        onSubmit={() => check('mobile', validateMobile, 'dept')}
        onBack={() => go('gender')}
        inputProps={{ inputMode: 'tel', autoComplete: 'tel-national', maxLength: 10 }}
        extra={
          !p.mobile && (
            <button type="button" className="btn btn--ghost btn--block" onClick={() => go('dept')}>
              <Icon name="skip" size={22} />
              <span>{t.skipMobile}</span>
            </button>
          )
        }
      />
    )
  } else if (step === 'dept') {
    body = (
      <section className="question" aria-labelledby="q-dept">
        <h1 id="q-dept" className="question__label">
          {t.qDept}
        </h1>
        <p className="question__hint">{t.qDeptHint}</p>
        <div className="dept-list" role="group" aria-labelledby="q-dept">
          {list.map((d) => (
            <DepartmentCard
              key={d.code}
              dept={d}
              selected={p.dept === d.code}
              onSelect={(code) => {
                set('dept')(code)
                go('review')
              }}
            />
          ))}
        </div>
        <Link className="btn btn--outline btn--block" to="/map?to=help_desk_0">
          <Icon name="help" size={22} />
          <span>{t.notSureHelpDesk}</span>
        </Link>
        <div className="describe">
          <button type="button" className="btn btn--ghost btn--block" aria-expanded={describeOpen} onClick={() => setDescribeOpen((o) => !o)}>
            <Icon name="message" size={22} />
            <span>{t.describeProblem}</span>
          </button>
          {describeOpen && (
            <div className="describe__body">
              <SymptomBox age={p.age} gender={p.gender} onResult={(r) => setSuggestion(r)} onEmergency={() => setSuggestion(null)} />
              {suggestion && (
                <TriageResult
                  result={suggestion}
                  onAccept={(code) => {
                    set('dept')(code)
                    go('review')
                  }}
                />
              )}
            </div>
          )}
        </div>
        <StepNav onBack={() => go('mobile')} />
      </section>
    )
  } else {
    const dept = byCode[p.dept]
    const gender = GENDERS.find(([v]) => v === p.gender)
    const rows = [
      ['name', t.labelName, p.firstName.trim()],
      ['age', t.labelAge, p.age],
      ['gender', t.labelGender, gender ? t[gender[1]] : ''],
      ['mobile', t.labelMobile, p.mobile || t.notGiven],
      ['dept', t.labelDept, dept ? deptName(dept) : t.notGiven],
    ]
    body = (
      <section className="question">
        <h1 className="page-title">{t.reviewTitle}</h1>
        <dl className="review-list">
          {rows.map(([key, label, value]) => (
            <div key={key} className="review-list__row">
              <dt>{label}</dt>
              <dd>{value}</dd>
              <button type="button" className="btn btn--ghost btn--small" onClick={() => go(key)} aria-label={`${t.change}: ${label}`}>
                <Icon name="edit" size={18} />
                <span>{t.change}</span>
              </button>
            </div>
          ))}
        </dl>
        {dept && (dept.rooms?.length > 0 || dept.floor !== undefined) && (
          <p className="explain">
            <Icon name="map-pin" size={22} />
            <span>{f('reviewWhere', { room: roomName(dept.rooms?.[0]), floor: floorName(dept.floor ?? 0) })}</span>
          </p>
        )}
        <ErrorNote error={submitError} />
        <StepNav onNext={submit} nextLabel={busy ? t.registering : t.getToken} nextIcon="ticket" busy={busy} nextDisabled={!dept} onBack={() => go('dept')} />
      </section>
    )
  }

  return (
    <Layout className="main--form">
      <Progress step={step} />
      {prefs.assisted && step !== 'intro' && (
        <p className="assist-chip">
          <Icon name="users" size={18} />
          <span>{t.assistedOn}</span>
        </p>
      )}
      {body}
      {step !== 'intro' && step !== 'review' && <div className="listen-row">{listenQuestion}</div>}
    </Layout>
  )
}
