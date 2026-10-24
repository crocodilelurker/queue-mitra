import { useEffect, useId, useRef, useState } from 'react'
import { api } from '../api/client.js'
import { useEmergency } from '../context/Emergency.jsx'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.js'
import { useI18n } from '../i18n/index.jsx'
import { ErrorNote } from './common/Status.jsx'
import { Icon } from './common/Icons.jsx'
import QuickSymptomPills from './QuickSymptomPills.jsx'

export const MAX_SYMPTOM_LENGTH = 500

/**
 * Modern AI-assisted Symptom Checker with Quick Symptom Pills, Voice Input, and Photo Attachment.
 * Red-flags directly prompt emergency assistance without queue delay.
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
    e?.preventDefault?.()
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

  const handleQuickSelect = (symptomText) => {
    setText(symptomText)
    setFieldError('')
  }

  return (
    <form className="symptom-card card" onSubmit={analyze} noValidate>
      <div className="symptom-card__header">
        <div className="symptom-card__badge">
          <Icon name="sparkles" size={16} />
          <span>Smart OPD Finder</span>
        </div>
        <span className="symptom-card__hint">Route directly to the right doctor</span>
      </div>

      <QuickSymptomPills onSelect={handleQuickSelect} />

      <div className={`symptom-input-wrap ${fieldError ? 'symptom-input-wrap--error' : ''} ${listening ? 'symptom-input-wrap--listening' : ''}`}>
        <textarea
          id={id}
          rows={3}
          maxLength={MAX_SYMPTOM_LENGTH}
          value={text}
          placeholder="e.g. Mild fever since yesterday, throat infection, BP checkup..."
          aria-invalid={fieldError ? 'true' : undefined}
          aria-describedby={fieldError ? `${id}-err` : undefined}
          onChange={(e) => {
            setText(e.target.value)
            setFieldError('')
          }}
        />

        {photo && (
          <div className="symptom__preview">
            <img src={photo} alt="Attached symptom preview" />
            <button
              type="button"
              className="preview-remove-btn"
              onClick={() => {
                setPhoto(null)
                if (fileRef.current) fileRef.current.value = ''
              }}
              title={t.photoRemove}
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        )}

        <div className="symptom-input-footer">
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

            {showPhoto && (
              <>
                <button
                  type="button"
                  className="tool-pill"
                  onClick={() => fileRef.current?.click()}
                  title={t.photo}
                >
                  <Icon name="camera" size={15} />
                  <span>{t.photo}</span>
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

          <span className="char-counter">
            {text.length}/{MAX_SYMPTOM_LENGTH}
          </span>
        </div>
      </div>

      {fieldError && (
        <p className="field__error" id={`${id}-err`} role="alert">
          <Icon name="alert" size={15} />
          <span>{fieldError}</span>
        </p>
      )}

      <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={busy}>
        {busy ? (
          <>
            <span className="spinner" aria-hidden="true" />
            <span>Analyzing symptoms...</span>
          </>
        ) : (
          <>
            <Icon name="search" size={18} />
            <span>{submitLabel || t.checkSymptoms}</span>
          </>
        )}
      </button>

      <ErrorNote error={error} />
    </form>
  )
}
