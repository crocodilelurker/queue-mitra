import { useRef, useState } from 'react'
import { useI18n } from '../../i18n/index.jsx'
import Field from './Field.jsx'
import { focusFirstInvalid, validateAll, validateRequired } from './validation.js'

const RULES = { doctorName: validateRequired, department: validateRequired }

export default function DoctorDepartmentStep({ values, onChange, onSubmit, onBack }) {
  const { t } = useI18n()
  const formRef = useRef(null)
  const [errors, setErrors] = useState({})

  const submit = (e) => {
    e.preventDefault()
    const found = validateAll(values, RULES)
    setErrors(found)
    if (Object.keys(found).length) {
      requestAnimationFrame(() => focusFirstInvalid(formRef.current))
      return
    }
    onSubmit()
  }

  const set = (field) => (e) => {
    onChange({ [field]: e.target.value })
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  return (
    <form ref={formRef} className="form" onSubmit={submit} noValidate>
      <Field label={t.doctorName} value={values.doctorName} onChange={set('doctorName')} error={errors.doctorName && t[errors.doctorName]} maxLength={80} />
      <Field label={t.department} value={values.department} onChange={set('department')} error={errors.department && t[errors.department]} maxLength={80} />
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
