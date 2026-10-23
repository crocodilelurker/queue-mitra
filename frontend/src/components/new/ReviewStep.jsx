import { useState } from 'react'
import { api } from '../../api/client.js'
import { useAccess } from '../../context/Access.jsx'
import { useDepartments } from '../../api/departments.js'
import { useI18n } from '../../i18n/index.jsx'
import { navigate } from '../../router.jsx'
import { ErrorNote } from '../common/Status.jsx'
import Toggle from '../common/Toggle.jsx'

/** Last step: check the details, set comfort options, and get the token (POST /api/tickets). */
export default function ReviewStep({ patient, deptCode, onBack }) {
  const { t, f, lang, deptName } = useI18n()
  const { prefs, setPref } = useAccess()
  const { byCode } = useDepartments()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const dept = byCode[deptCode]

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const ticket = await api.createTicket({
        departmentCode: deptCode,
        firstName: patient.firstName.trim(),
        age: Number(patient.age),
        gender: patient.gender,
        mobile: patient.mobile.trim() || undefined,
        language: lang,
        isAssisted: patient.assisted,
        helperName: patient.assisted ? patient.helperName.trim() || undefined : undefined,
        accessibility: {
          avoidStairs: prefs.avoidStairs,
          largeText: prefs.largeText,
          readAloud: prefs.readAloud,
          highContrast: prefs.highContrast,
        },
      })
      navigate(`/slip/${ticket.publicId}`, { replace: true })
    } catch (err) {
      setError(err)
      setBusy(false)
    }
  }

  const rows = [
    [t.firstName, patient.firstName.trim()],
    [t.age, patient.age.trim()],
    [t.gender, t[`gender${patient.gender[0].toUpperCase()}${patient.gender.slice(1)}`]],
    [t.department, dept ? deptName(dept) : deptCode],
    ...(dept ? [[t.roomFloor, f('roomFloorValue', { rooms: dept.rooms.join(', '), floor: dept.floor })]] : []),
  ]

  return (
    <div className="form">
      <dl className="summary">
        {rows.map(([label, value]) => (
          <div key={label} className="summary__row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <h3 className="form__subtitle">{t.prefsTitle}</h3>
      <div className="toggles">
        <Toggle icon="♿" label={t.prefAvoidStairs} checked={prefs.avoidStairs} onChange={(v) => setPref('avoidStairs', v)} />
        <Toggle icon="🔠" label={t.prefLargeText} checked={prefs.largeText} onChange={(v) => setPref('largeText', v)} />
        <Toggle icon="🔊" label={t.prefReadAloud} checked={prefs.readAloud} onChange={(v) => setPref('readAloud', v)} />
        <Toggle icon="◐" label={t.prefHighContrast} checked={prefs.highContrast} onChange={(v) => setPref('highContrast', v)} />
      </div>
      <ErrorNote error={error} />
      <div className="form__actions">
        <button type="button" className="btn" onClick={onBack} disabled={busy}>
          <span aria-hidden="true">←</span> {t.back}
        </button>
        <button type="button" className="btn btn--primary" onClick={submit} disabled={busy}>
          <span aria-hidden="true">🎟️</span> {busy ? t.registering : t.getToken}
        </button>
      </div>
    </div>
  )
}
