import { useRef, useState } from 'react'
import { useI18n } from '../../i18n/index.jsx'
import Field from './Field.jsx'
import { focusFirstInvalid, MAX_PROBLEM_LENGTH, validateProblem } from './validation.js'

export default function ProblemStep({ value, onChange, onSubmit, onBack }) {
  const { t } = useI18n()
  const formRef = useRef(null)
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const found = validateProblem(value)
    setError(found)
    if (found) {
      requestAnimationFrame(() => focusFirstInvalid(formRef.current))
      return
    }
    onSubmit()
  }

  return (
    <form ref={formRef} className="form" onSubmit={submit} noValidate>
      <Field
        multiline
        rows={5}
        label={t.problemLabel}
        placeholder={t.problemPlaceholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          if (error) setError('')
        }}
        error={error && t[error]}
        hint={`${value.length} / ${MAX_PROBLEM_LENGTH}`}
      />
      <div className="form__actions">
        <button type="button" className="btn" onClick={onBack}>
          {t.back}
        </button>
        <button type="submit" className="btn btn--primary">
          {t.submit}
        </button>
      </div>
    </form>
  )
}
