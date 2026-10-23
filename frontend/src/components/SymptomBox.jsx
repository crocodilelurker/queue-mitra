import { useEffect, useId, useRef, useState } from 'react'
import { api } from '../api/client.js'
import { useEmergency } from '../context/Emergency.jsx'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.js'
import { useI18n } from '../i18n/index.jsx'
import { ErrorNote } from './common/Status.jsx'

export const MAX_SYMPTOM_LENGTH = 500

/**
 * Describe symptoms by typing or speaking (optionally attach a photo), then ask the backend for a
 * department suggestion. Red-flag symptoms open the emergency guidance instead of a suggestion.
 * onResult(result, text) receives the non-emergency suggestion.
 */
export default function SymptomBox({ onResult, onEmergency, showPhoto = false, age, gender, submitLabel }) {
  const { t, lang } = useI18n()
  const { openEmergency } = useEmergency()
  const id = useId()
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState(null)
  const [error, setError] = useState(null)
  const [fieldError, setFieldError] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const { supported, listening, start, stop } = useSpeechRecognition({
    lang: t.speechLang,
    onResult: (spoken) => setText((prev) => (prev ? `${prev} ${spoken}` : spoken).slice(0, MAX_SYMPTOM_LENGTH)),
  })

  useEffect(() => () => photo && URL.revokeObjectURL(photo), [photo])

  const analyze = async (e) => {
    e.preventDefault()
    if (!text.trim()) return setFieldError(t.errProblemRequired)
    setFieldError('')
    setError(null)
    setBusy(true)
    try {
      const result = await api.suggest({ text: text.trim(), age: age ? Number(age) : undefined, gender: gender || undefined, language: lang })
      if (result.isEmergency) {
        const detail = { directive: result.directive, reason: result.emergencyWarning?.reason }
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
      <div className={`box symptom__field${fieldError ? ' symptom__field--error' : ''}`}>
        <textarea
          id={id}
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
        {photo && (
          <div className="symptom__preview">
            <img src={photo} alt="" />
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => {
                setPhoto(null)
                if (fileRef.current) fileRef.current.value = ''
              }}
            >
              <span aria-hidden="true">✕</span> {t.photoRemove}
            </button>
          </div>
        )}
      </div>
      <p className="field__hint">
        {text.length} / {MAX_SYMPTOM_LENGTH}
      </p>
      {fieldError && (
        <p className="field__error" id={`${id}-err`} role="alert">
          {fieldError}
        </p>
      )}
      <div className="symptom__actions">
        <button type="button" className="btn" aria-pressed={listening} disabled={!supported} title={supported ? undefined : t.micUnsupported} onClick={listening ? stop : start}>
          <span aria-hidden="true">{listening ? '■' : '🎙'}</span> {listening ? t.micStop : t.mic}
        </button>
        {showPhoto && (
          <>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              <span aria-hidden="true">📷</span> {t.photo}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) setPhoto(URL.createObjectURL(file))
              }}
            />
          </>
        )}
      </div>
      <button type="submit" className="btn btn--primary" disabled={busy}>
        <span aria-hidden="true">🔎</span> {busy ? t.loading : submitLabel || t.checkSymptoms}
      </button>
      <ErrorNote error={error} />
    </form>
  )
}
