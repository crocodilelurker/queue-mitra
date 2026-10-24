import { useState } from 'react'
import { api } from '../../api/client.js'
import { useAccess } from '../../context/Access.jsx'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition.js'
import { useI18n } from '../../i18n/index.jsx'
import { navigate } from '../../router.jsx'
import { ErrorNote } from '../common/Status.jsx'
import { Icon } from '../common/Icons.jsx'
import Field from './Field.jsx'

export const MAX_COMPLAINT_LENGTH = 200
const DEFAULT_DEPARTMENT = 'MED'

/** Emergency flow, step 2: "disease or problem, if you know it (optional)", then the ticket at once. */
export default function EmergencyTicketStep({ patient, onBack }) {
  const { t, lang } = useI18n()
  const { prefs } = useAccess()
  const [complaint, setComplaint] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const { supported, listening, start, stop } = useSpeechRecognition({
    lang: t.speechLang,
    onResult: (spoken) => setComplaint((prev) => (prev ? `${prev} ${spoken}` : spoken).slice(0, MAX_COMPLAINT_LENGTH)),
  })

  const chooseDepartment = async (text) => {
    if (!text) return DEFAULT_DEPARTMENT
    try {
      const result = await api.suggest({ text, age: Number(patient.age), gender: patient.gender, language: lang })
      return result.isEmergency ? DEFAULT_DEPARTMENT : result.suggestedDepartment.code
    } catch {
      return DEFAULT_DEPARTMENT
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const text = complaint.trim()
      const ticket = await api.createTicket({
        departmentCode: await chooseDepartment(text),
        firstName: patient.firstName.trim(),
        age: Number(patient.age),
        gender: patient.gender,
        mobile: patient.mobile.trim() || undefined,
        language: lang,
        isAssisted: patient.assisted,
        helperName: patient.assisted ? patient.helperName.trim() || undefined : undefined,
        accessibility: { avoidStairs: prefs.avoidStairs, largeText: prefs.largeText, readAloud: prefs.readAloud, highContrast: prefs.highContrast },
        emergency: true,
        complaint: text || undefined,
      })
      navigate(`/slip/${ticket.publicId}`, { replace: true })
    } catch (err) {
      setError(err)
      setBusy(false)
    }
  }

  return (
    <form className="form card" onSubmit={submit} noValidate>
      <div className="form__header">
        <h2 className="form__title">{t.emergencyTicketTitle}</h2>
        <p className="form__subtitle">{t.emergencyTicketBody}</p>
      </div>

      <Field
        multiline
        rows={3}
        label={t.complaintLabel}
        hint={`${t.complaintHint} (${complaint.length} / ${MAX_COMPLAINT_LENGTH})`}
        value={complaint}
        maxLength={MAX_COMPLAINT_LENGTH}
        placeholder="Brief description of the urgent symptoms..."
        onChange={(e) => setComplaint(e.target.value)}
      />

      <div className="symptom-input-tools">
        <button
          type="button"
          className={`tool-pill ${listening ? 'tool-pill--active' : ''}`}
          aria-pressed={listening}
          disabled={!supported}
          title={supported ? undefined : t.micUnsupported}
          onClick={listening ? stop : start}
        >
          <Icon name={listening ? 'mic-stop' : 'mic'} size={15} />
          <span>{listening ? t.micStop : t.mic}</span>
        </button>
      </div>

      <ErrorNote error={error} />

      <div className="form__actions">
        <button type="button" className="btn btn--outline" onClick={onBack} disabled={busy}>
          <Icon name="arrow-left" size={18} />
          <span>{t.back}</span>
        </button>
        <button type="submit" className="btn btn--danger btn--lg" disabled={busy}>
          <Icon name="emergency" size={18} />
          <span>{busy ? t.registering : t.getEmergencyTicket}</span>
        </button>
      </div>
    </form>
  )
}
