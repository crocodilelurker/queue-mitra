import { useState } from 'react'
import { api } from '../../api/client.js'
import Field from '../new/Field.jsx'

/** Quick staff PIN login, or doctor email + password. */
export default function StaffLogin({ onSignIn }) {
  const [pin, setPin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const attempt = async (request, event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onSignIn(request)
    } catch (err) {
      setError(err.status === 0 ? 'Cannot reach the server.' : err.status === 401 ? err.message : 'Could not log in.')
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <h1 className="hero hero--sm">Staff and doctors</h1>
      {error && (
        <p className="status status--error" role="alert">
          {error}
        </p>
      )}
      <form className="box panel form" onSubmit={(e) => attempt(() => api.staffPin(pin.trim()), e)} noValidate>
        <h2 className="form__title">Quick staff login</h2>
        <Field label="Staff PIN" type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value)} maxLength={12} />
        <button type="submit" className="btn btn--primary" disabled={busy || !pin.trim()}>
          <span aria-hidden="true">🔑</span> Log in with PIN
        </button>
      </form>
      <form className="box panel form" onSubmit={(e) => attempt(() => api.login(email.trim(), password), e)} noValidate>
        <h2 className="form__title">Doctor login</h2>
        <Field label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" className="btn btn--primary" disabled={busy || !email.trim() || !password}>
          <span aria-hidden="true">🩺</span> Log in as doctor
        </button>
      </form>
    </div>
  )
}
