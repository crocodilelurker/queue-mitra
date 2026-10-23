import { useId } from 'react'

/** Labelled text input / textarea with an accessible error message. */
export default function Field({ label, error, hint, multiline, className = '', ...props }) {
  const id = useId()
  const errId = `${id}-err`
  const hintId = `${id}-hint`
  const Control = multiline ? 'textarea' : 'input'
  const describedBy = [error && errId, hint && hintId].filter(Boolean).join(' ') || undefined
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <Control
        id={id}
        className={`field__control${error ? ' field__control--error' : ''} ${className}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {hint && (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field__error" id={errId} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
