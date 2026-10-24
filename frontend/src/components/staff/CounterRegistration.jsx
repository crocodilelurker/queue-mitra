import { useState } from 'react'
import { api } from '../../api/client.js'
import { useDepartments } from '../../api/departments.js'
import { Link } from '../../router.jsx'
import Field from '../new/Field.jsx'
import { MAX_AGE, validateAge, validateFirstName, validateGender } from '../new/validation.js'
import { Icon } from '../common/Icons.jsx'

/** Walk-in registration for patients without a smartphone (POST /api/tickets/counter). */
export default function CounterRegistration() {
  const { list } = useDepartments()
  const [form, setForm] = useState({ firstName: '', age: '', gender: '', departmentCode: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [issued, setIssued] = useState(null)
  const [error, setError] = useState('')

  const messages = {
    errNameRequired: 'Enter the first name.',
    errNameLong: 'Name is too long.',
    errAgeRequired: 'Enter the age.',
    errAgeInvalid: `Age must be a whole number from 0 to ${MAX_AGE}.`,
    errGenderRequired: 'Choose a gender.',
  }
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const found = {
      firstName: validateFirstName(form.firstName),
      age: validateAge(form.age),
      gender: validateGender(form.gender),
      departmentCode: form.departmentCode ? '' : 'Choose a department.',
    }
    Object.keys(found).forEach((k) => !found[k] && delete found[k])
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    setError('')
    try {
      const slip = await api.counterRegister({ ...form, firstName: form.firstName.trim(), age: Number(form.age) })
      setIssued(slip)
      setForm({ firstName: '', age: '', gender: '', departmentCode: '' })
    } catch (err) {
      setError(err.status === 0 ? 'Cannot reach the server.' : err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="box panel">
      <h2 className="form__title">Counter registration (walk-in)</h2>
      <form className="form" onSubmit={submit} noValidate>
        <Field label="First name" value={form.firstName} onChange={set('firstName')} error={messages[errors.firstName]} maxLength={60} />
        <Field label="Age" value={form.age} onChange={set('age')} error={messages[errors.age]} inputMode="numeric" maxLength={3} />
        <div className="field">
          <label className="field__label" htmlFor="counter-gender">
            Gender
          </label>
          <select id="counter-gender" className="field__control" value={form.gender} onChange={set('gender')} aria-invalid={errors.gender ? 'true' : undefined}>
            <option value="">Choose…</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          {errors.gender && <p className="field__error">{messages[errors.gender]}</p>}
        </div>
        <div className="field">
          <label className="field__label" htmlFor="counter-dept">
            Department
          </label>
          <select id="counter-dept" className="field__control" value={form.departmentCode} onChange={set('departmentCode')} aria-invalid={errors.departmentCode ? 'true' : undefined}>
            <option value="">Choose…</option>
            {list.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </select>
          {errors.departmentCode && <p className="field__error">{errors.departmentCode}</p>}
        </div>
        {error && <p className="field__error" role="alert">{error}</p>}
        <button type="submit" className="btn btn--primary" disabled={busy}>
          <Icon name="ticket" size={18} /> {busy ? 'Registering…' : 'Register and issue slip'}
        </button>
      </form>
      {issued && (
        <div className="notice" role="status">
          <strong>
            Token {issued.tokenNumber} · {issued.department.name} · {issued.room}, Floor {issued.department.floor}
          </strong>
          <p>
            <Link to={`/slip/${issued.publicId}`}>Open slip to print</Link>
          </p>
        </div>
      )}
    </section>
  )
}
