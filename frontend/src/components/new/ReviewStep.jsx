import { useState } from 'react'
import { api } from '../../api/client.js'
import { useAccess } from '../../context/Access.jsx'
import { useDepartments } from '../../api/departments.js'
import { useI18n } from '../../i18n/index.jsx'
import { navigate } from '../../router.jsx'
import { ErrorNote } from '../common/Status.jsx'
import Toggle from '../common/Toggle.jsx'
import { Icon } from '../common/Icons.jsx'

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
    <div className="form card">
      <div className="form__header">
        <h2 className="form__title">Review & Preferences</h2>
        <p className="form__subtitle">Confirm your consultation information and accessibility settings</p>
      </div>

      <dl className="summary-list">
        {rows.map(([label, value]) => (
          <div key={label} className="summary-list__item">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="preferences-section">
        <h3 className="preferences-section__title">
          <Icon name="user" size={16} />
          <span>{t.prefsTitle}</span>
        </h3>
        <div className="toggles">
          <Toggle iconName="map" label={t.prefAvoidStairs} checked={prefs.avoidStairs} onChange={(v) => setPref('avoidStairs', v)} />
          <Toggle iconName="sparkles" label={t.prefLargeText} checked={prefs.largeText} onChange={(v) => setPref('largeText', v)} />
          <Toggle iconName="speaker" label={t.prefReadAloud} checked={prefs.readAloud} onChange={(v) => setPref('readAloud', v)} />
          <Toggle iconName="eye" label={t.prefHighContrast} checked={prefs.highContrast} onChange={(v) => setPref('highContrast', v)} />
        </div>
      </div>

      <ErrorNote error={error} />

      <div className="form__actions">
        <button type="button" className="btn btn--outline" onClick={onBack} disabled={busy}>
          <Icon name="arrow-left" size={18} />
          <span>{t.back}</span>
        </button>
        <button type="button" className="btn btn--primary btn--lg" onClick={submit} disabled={busy}>
          <Icon name="ticket" size={18} />
          <span>{busy ? t.registering : t.getToken}</span>
        </button>
      </div>
    </div>
  )
}
