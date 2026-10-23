import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/index.jsx'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.js'

export default function SymptomInput() {
  const { t } = useI18n()
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState(null)
  const fileRef = useRef(null)

  const { supported, listening, start, stop } = useSpeechRecognition({
    lang: t.speechLang,
    onResult: (spoken) => setText((prev) => (prev ? `${prev} ${spoken}` : spoken)),
  })

  useEffect(() => () => photo && URL.revokeObjectURL(photo), [photo])

  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (file) setPhoto(URL.createObjectURL(file))
  }
  const clearPhoto = () => {
    setPhoto(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="symptom">
      <label className="symptom__label" htmlFor="symptom">
        {t.symptomLabel}
      </label>
      <div className="box symptom__field">
        <textarea
          id="symptom"
          rows={2}
          value={text}
          placeholder={t.symptomPlaceholder}
          onChange={(e) => setText(e.target.value)}
        />
        {photo && (
          <div className="symptom__preview">
            <img src={photo} alt="" />
            <button type="button" className="btn btn--sm" onClick={clearPhoto}>
              {t.photoRemove}
            </button>
          </div>
        )}
      </div>
      <div className="symptom__actions">
        <button
          type="button"
          className="btn"
          aria-pressed={listening}
          disabled={!supported}
          title={supported ? undefined : t.micUnsupported}
          onClick={listening ? stop : start}
        >
          <span aria-hidden="true">{listening ? '■' : '🎙'}</span> {listening ? t.micStop : t.mic}
        </button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          <span aria-hidden="true">📷</span> {t.photo}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      </div>
    </div>
  )
}
