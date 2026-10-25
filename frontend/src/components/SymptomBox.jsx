import { useId, useState } from 'react'
import { api } from '../api/client.js'
import { useEmergency } from '../context/Emergency.jsx'
import { useI18n } from '../i18n/index.jsx'
import { ErrorNote } from './common/Status.jsx'
import { Icon } from './common/Icons.jsx'
import MicButton from './MicButton.jsx'

export const MAX_SYMPTOM_LENGTH = 500

/**
 * "Describe your problem": the backend only SUGGESTS a department, never a diagnosis.
 * If the words sound like an emergency the emergency guidance opens at once.
 */
export default function SymptomBox({ onResult, onEmergency, age, gender }) {
  const { t, lang } = useI18n()
  const { openEmergency } = useEmergency()
  const id = useId()
  const [text, setText] = useState('')
  const [error, setError] = useState(null)
  const [fieldError, setFieldError] = useState('')
  const [busy, setBusy] = useState(false)

  const analyze = async (e) => {
    e?.preventDefault?.()
    if (!text.trim()) return setFieldError(t.errProblemRequired)
    setFieldError('')
    setError(null)
    setBusy(true)
    try {
      const result = await api.suggest({ text: text.trim(), age: age ? Number(age) : undefined, gender: gender || undefined, language: lang })
      if (result.isEmergency) {
        const detail = { directive: result.directive }
        onEmergency?.(detail)
        openEmergency(detail)
      } else {
        onResult(result, text.trim())
      }
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="symptom" onSubmit={analyze} noValidate>
      <label className="field__label" htmlFor={id}>
        {t.symptomLabel}
      </label>
      <textarea
        id={id}
        className={`field__control${fieldError ? ' field__control--error' : ''}`}
        rows={3}
        maxLength={MAX_SYMPTOM_LENGTH}
        value={text}
        placeholder={t.symptomPlaceholder}
        aria-invalid={fieldError ? 'true' : undefined}
        aria-describedby={fieldError ? `${id}-err` : undefined}
        onChange={(e) => {
          setText(e.target.value)
          setFieldError('')
        }}
      />
      {fieldError && (
        <p className="field__error" id={`${id}-err`} role="alert">
          {fieldError}
        </p>
      )}
      <div className="symptom__row">
        <MicButton onText={(spoken) => setText((prev) => (prev ? `${prev} ${spoken}` : spoken).slice(0, MAX_SYMPTOM_LENGTH))} />
        <button type="submit" className="btn btn--secondary" disabled={busy}>
          <Icon name="search" size={22} />
          <span>{busy ? t.loading : t.suggestDept}</span>
        </button>
      </div>
      <ErrorNote error={error} />
    </form>
  )
}
