import { useRef, useState } from 'react'
import { useI18n } from '../../i18n/index.jsx'
import Field from './Field.jsx'
import { focusFirstInvalid, MAX_NAME_LENGTH, validateAge, validateAll, validateFirstName, validateGender } from './validation.js'

const RULES = { firstName: validateFirstName, age: validateAge, gender: validateGender }
const GENDERS = [
  ['male', 'genderMale'],
  ['female', 'genderFemale'],
  ['other', 'genderOther'],
]

export default function PatientInfoStep({ patient, onChange, onContinue }) {
  const { t } = useI18n()
  const formRef = useRef(null)
  const [errors, setErrors] = useState({})

  const submit = (e) => {
    e.preventDefault()
    const found = validateAll(patient, RULES)
    setErrors(found)
    if (Object.keys(found).length) {
      requestAnimationFrame(() => focusFirstInvalid(formRef.current))
      return
    }
    onContinue()
  }

  const set = (field) => (e) => {
    onChange({ [field]: e.target.value })
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  return (
    <form ref={formRef} className="form" onSubmit={submit} noValidate>
      <Field
        label={t.firstName}
        value={patient.firstName}
        onChange={set('firstName')}
        error={errors.firstName && t[errors.firstName]}
        autoComplete="given-name"
        maxLength={MAX_NAME_LENGTH + 10}
      />
      <Field
        label={t.age}
        value={patient.age}
        onChange={set('age')}
        error={errors.age && t[errors.age]}
        inputMode="numeric"
        autoComplete="off"
        maxLength={3}
      />
      <fieldset className="choice" data-invalid={errors.gender ? 'true' : undefined} aria-describedby={errors.gender ? 'gender-err' : undefined}>
        <legend className="field__label">{t.gender}</legend>
        <div className="choice__row">
          {GENDERS.map(([value, key]) => (
            <label key={value} className="choice__item">
              <input
                type="radio"
                name="gender"
                value={value}
                checked={patient.gender === value}
                onChange={set('gender')}
                aria-invalid={errors.gender ? 'true' : undefined}
              />
              <span>{t[key]}</span>
            </label>
          ))}
        </div>
        {errors.gender && (
          <p className="field__error" id="gender-err" role="alert">
            {t[errors.gender]}
          </p>
        )}
      </fieldset>
      <button type="submit" className="btn btn--primary">
        {t.continue}
      </button>
    </form>
  )
}
