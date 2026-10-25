import { useEffect, useState } from 'react'
import { useAuth, isAdminRole } from '../../context/AuthContext.jsx'
import { useHospital } from '../../context/Hospital.jsx'
import { navigate, useLocation } from '../../router.jsx'
import { Icon } from '../../components/common/Icons.jsx'
import { Button, InlineError, PasswordField, TextField, errorText } from '../../components/staff/ui.jsx'
import '../setup/setup.css'

export function homeFor(role) {
  if (isAdminRole(role)) return '/admin'
  if (role === 'doctor') return '/doctor'
  if (role === 'staff') return '/admin/counter'
  return '/login'
}

function safeNext(search) {
  const next = new URLSearchParams(search).get('next')
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/login') ? next : null
}

export default function Login() {
  const { currentUser, ready, login, loginWithPin } = useAuth()
  const { hospital } = useHospital()
  const { search } = useLocation()
  const [tab, setTab] = useState('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const next = safeNext(search)

  useEffect(() => {
    document.title = `Staff sign in · ${hospital?.name || 'Queue Mitra'}`
  }, [hospital])

  useEffect(() => {
    if (ready && currentUser) navigate(next || homeFor(currentUser.role), { replace: true })
  }, [ready, currentUser, next])

  const submit = async (e) => {
    e.preventDefault()
    const err = {}
    if (tab === 'email') {
      if (!email.trim()) err.email = 'Enter your email.'
      if (!password) err.password = 'Enter your password.'
    } else if (!/^\d{4,6}$/.test(pin)) err.pin = 'The counter PIN is 4 to 6 digits.'
    setErrors(err)
    if (Object.keys(err).length) return
    setBusy(true)
    setError(null)
    try {
      const user = tab === 'email' ? await login(email.trim().toLowerCase(), password) : await loginWithPin(pin)
      navigate(next || homeFor(user.role), { replace: true })
    } catch (e2) {
      if (e2.status === 401 || e2.status === 400 || e2.status === 403) {
        setError(new Error(tab === 'email' ? 'That email and password do not match. Check them and try again.' : 'That PIN is not right. Ask your administrator for the counter PIN.'))
      } else setError(e2)
      setBusy(false)
    }
  }

  const switchTab = (t) => {
    setTab(t)
    setErrors({})
    setError(null)
  }

  return (
    <div className="sx lg">
      <aside className="lg-aside">
        <div className="sx-brand">
          <span className="sx-brand__mark" aria-hidden="true">
            <Icon name="queue" size={20} />
          </span>
          <span className="sx-brand__text">
            <span className="sx-brand__name">Queue Mitra</span>
            <span className="sx-brand__hospital">{hospital?.name || 'Staff console'}</span>
          </span>
        </div>
        <h1>One live screen for every OPD queue in {hospital?.name || 'your hospital'}.</h1>
        <ul>
          <li>
            <Icon name="alert" size={20} /> Urgent help requests appear at the top of every staff screen, with a sound.
          </li>
          <li>
            <Icon name="megaphone" size={20} /> Call the next patient — their phone and the TV board update at once.
          </li>
          <li>
            <Icon name="user-plus" size={20} /> Register patients without a phone at the counter and print their slip.
          </li>
        </ul>
      </aside>
      <main className="lg-main">
        <form className="lg-card" onSubmit={submit} noValidate>
          <div>
            <h2>Staff sign in</h2>
            <p className="sx-muted" style={{ marginTop: 4 }}>
              For doctors, counter staff and administrators of {hospital?.name || 'this hospital'}.
            </p>
          </div>

          <div className="sx-seg" role="tablist" aria-label="Sign-in method" style={{ display: 'flex' }}>
            <button type="button" role="tab" aria-selected={tab === 'email'} onClick={() => switchTab('email')} style={{ flex: 1, justifyContent: 'center' }}>
              <Icon name="mail" size={16} /> Email
            </button>
            <button type="button" role="tab" aria-selected={tab === 'pin'} onClick={() => switchTab('pin')} style={{ flex: 1, justifyContent: 'center' }}>
              <Icon name="key" size={16} /> Counter PIN
            </button>
          </div>

          {tab === 'email' ? (
            <div className="sx-form" role="tabpanel">
              <TextField label="Email" type="email" className="sx-input--lg" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} autoComplete="username" autoFocus />
              <PasswordField label="Password" className="sx-input--lg" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} autoComplete="current-password" />
            </div>
          ) : (
            <div className="sx-form" role="tabpanel">
              <PasswordField
                label="Hospital counter PIN"
                hint="The 4–6 digit PIN your administrator set. It opens the queue console and the registration counter."
                className="sx-input--lg lg-pin"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                error={errors.pin}
                autoComplete="off"
                autoFocus
              />
            </div>
          )}

          {error && <InlineError>{errorText(error)}</InlineError>}

          <Button type="submit" variant="primary" size="lg" block busy={busy} icon={busy ? undefined : 'lock'}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>

          <p className="sx-small sx-muted" style={{ display: 'flex', gap: 8 }}>
            <Icon name="help" size={16} />
            <span>Accounts are created by your hospital administrator under People. A real hospital would connect this to its staff directory.</span>
          </p>
          <p className="sx-small">
            <a href="/" style={{ color: 'var(--primary)', fontWeight: 600 }}>
              ← Patient app
            </a>
          </p>
        </form>
      </main>
    </div>
  )
}
