import { useState } from 'react'
import Modal from './Modal.jsx'
import { Icon } from './Icons.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

export default function AuthLoginModal() {
  const {
    isLoginModalOpen,
    closeLoginModal,
    loginWithCredentials,
    loginAsAdmin,
    loginAsDoctor,
    loginWithPin,
    authLoading,
    authError,
  } = useAuth()

  const [activeTab, setActiveTab] = useState('quick') // 'quick' | 'form'
  const [email, setEmail] = useState('admin@queuemitra.test')
  const [password, setPassword] = useState('doctor123')
  const [pin, setPin] = useState('1234')

  if (!isLoginModalOpen) return null

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    try {
      await loginWithCredentials(email, password)
    } catch {
      // error set in context
    }
  }

  const handlePinSubmit = async (e) => {
    e.preventDefault()
    try {
      await loginWithPin(pin)
    } catch {
      // error set in context
    }
  }

  return (
    <Modal open={isLoginModalOpen} onClose={closeLoginModal}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              background: '#0d9488',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
              marginBottom: '0.5rem',
            }}
          >
            <Icon name="med" size={24} color="#ffffff" />
          </div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--ink)', fontWeight: 800 }}>
            MediFlow Clinic Access
          </h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
            Switch between Clinic Administrator, Doctors, or Staff Kiosk
          </p>
        </div>

        {authError && (
          <div className="note note--danger" style={{ fontSize: '0.85rem' }}>
            {authError}
          </div>
        )}

        {/* Tab switch */}
        <div style={{ display: 'flex', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.25rem' }}>
          <button
            type="button"
            className="btn"
            style={{
              flex: 1,
              background: activeTab === 'quick' ? '#ffffff' : 'transparent',
              boxShadow: activeTab === 'quick' ? 'var(--shadow-sm)' : 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              color: activeTab === 'quick' ? '#0d9488' : 'var(--ink-soft)',
            }}
            onClick={() => setActiveTab('quick')}
          >
            Quick 1-Click Roles
          </button>
          <button
            type="button"
            className="btn"
            style={{
              flex: 1,
              background: activeTab === 'form' ? '#ffffff' : 'transparent',
              boxShadow: activeTab === 'form' ? 'var(--shadow-sm)' : 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              color: activeTab === 'form' ? '#0d9488' : 'var(--ink-soft)',
            }}
            onClick={() => setActiveTab('form')}
          >
            Credentials Login
          </button>
        </div>

        {activeTab === 'quick' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {/* Admin One-Click */}
            <button
              type="button"
              disabled={authLoading}
              onClick={loginAsAdmin}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                border: '1.5px solid #0d9488',
                borderRadius: 'var(--radius-sm)',
                background: '#f0fdfa',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div>
                <strong style={{ fontSize: '0.95rem', color: '#0f766e', display: 'block' }}>
                  Asha Kulkarni (Administrator)
                </strong>
                <span style={{ fontSize: '0.78rem', color: '#115e59' }}>
                  Full clinic access, OPD queue, patients, doctors & billing
                </span>
              </div>
              <span className="badge" style={{ background: '#0d9488', color: '#ffffff', fontSize: '0.75rem', fontWeight: 700 }}>
                ADMIN
              </span>
            </button>

            {/* Doctor 1 */}
            <button
              type="button"
              disabled={authLoading}
              onClick={() =>
                loginAsDoctor({
                  name: 'Dr. Anita Sharma',
                  email: 'anita@queuemitra.test',
                  specialty: 'Internal Medicine',
                  room: 'Room 1',
                })
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--surface)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div>
                <strong style={{ fontSize: '0.92rem', color: 'var(--ink)', display: 'block' }}>
                  Dr. Anita Sharma (Physician)
                </strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                  Internal Medicine • Room 1 • Consultation Desk
                </span>
              </div>
              <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '0.75rem' }}>
                DOCTOR
              </span>
            </button>

            {/* Doctor 2 */}
            <button
              type="button"
              disabled={authLoading}
              onClick={() =>
                loginAsDoctor({
                  name: 'Dr. Sunita Rao',
                  email: 'sunita@queuemitra.test',
                  specialty: 'Obstetrics & Gynaecology',
                  room: 'Room 4',
                })
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--surface)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div>
                <strong style={{ fontSize: '0.92rem', color: 'var(--ink)', display: 'block' }}>
                  Dr. Sunita Rao (Gynecology)
                </strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                  Women & Maternal Care • Room 4
                </span>
              </div>
              <span className="badge" style={{ background: '#fdf2f8', color: '#9d174d', fontSize: '0.75rem' }}>
                DOCTOR
              </span>
            </button>

            {/* Doctor 3 */}
            <button
              type="button"
              disabled={authLoading}
              onClick={() =>
                loginAsDoctor({
                  name: 'Dr. Meena Iyer',
                  email: 'meena@queuemitra.test',
                  specialty: 'Pediatrics',
                  room: 'Room 3',
                })
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--surface)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div>
                <strong style={{ fontSize: '0.92rem', color: 'var(--ink)', display: 'block' }}>
                  Dr. Meena Iyer (Pediatrics)
                </strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                  Child Health Care • Room 3
                </span>
              </div>
              <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.75rem' }}>
                DOCTOR
              </span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  required
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@queuemitra.test"
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  required
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="doctor123"
                />
              </div>

              <button
                type="submit"
                className="btn btn--primary"
                disabled={authLoading}
                style={{ background: '#0d9488', borderColor: '#0d9488', justifyContent: 'center' }}
              >
                {authLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <form onSubmit={handlePinSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Staff PIN (1234)"
                  className="form-control"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  style={{ width: '130px' }}
                />
                <button
                  type="submit"
                  className="btn btn--subtle"
                  disabled={authLoading || !pin.trim()}
                  style={{ fontSize: '0.85rem' }}
                >
                  Sign In with PIN
                </button>
              </form>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
          <button type="button" className="btn btn--subtle" onClick={closeLoginModal}>
            Dismiss
          </button>
        </div>
      </div>
    </Modal>
  )
}
