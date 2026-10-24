import { useEffect, useState } from 'react'
import { api, session } from '../api/client.js'
import { useDepartments } from '../api/departments.js'
import { useSocket, reconnectSocket } from '../api/socket.js'
import Modal from '../components/common/Modal.jsx'
import { ErrorNote, Loading } from '../components/common/Status.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { useStaffSession } from '../hooks/useStaffSession.js'
import { useAuth } from '../context/AuthContext.jsx'
import { Link, navigate } from '../router.jsx'
import { Icon } from '../components/common/Icons.jsx'
import './doctor.css'

const minutesSince = (value) => Math.max(0, Math.floor((Date.now() - new Date(value)) / 60000))

function ConsultTimer({ since }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(since)) / 1000))
  return (
    <span className="consultation-timer">
      <Icon name="clock" size={15} />
      <span>
        {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
      </span>
    </span>
  )
}

export default function DoctorDashboard() {
  const { user, signOut } = useStaffSession()
  const { currentUser, loginAsDoctor, logout } = useAuth()
  const activeDoctorUser = user?.role === 'doctor' ? user : currentUser?.role === 'doctor' ? currentUser : null

  const handleSignOut = async () => {
    signOut()
    await logout()
  }

  // If not logged in as doctor, display clean chamber selector
  if (!activeDoctorUser) {
    return (
      <DoctorChamberSelector
        onSelectDoctor={async (doc) => {
          try {
            const res = await api.login(doc.email, 'doctor123')
            session.set(res.token)
            reconnectSocket()
          } catch {
            /* use local doctor fallback */
          }
          await loginAsDoctor(doc)
        }}
      />
    )
  }

  return <DoctorChamberWorkspace doctor={activeDoctorUser} onSignOut={handleSignOut} />
}

/** Doctor Chamber Workspace Component */
function DoctorChamberWorkspace({ doctor, onSignOut }) {
  const { list } = useDepartments()
  const { data, error, loading, reload } = useAsync(() => api.dashboard(), [])
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [transferOpen, setTransferOpen] = useState(false)

  // Clinical form state for currently examined patient
  const [diagnosis, setDiagnosis] = useState('')
  const [consultationNotes, setConsultationNotes] = useState('')
  const [prescriptions, setPrescriptions] = useState('')
  const [needsFollowUp, setNeedsFollowUp] = useState(true)
  const [followUpDate, setFollowUpDate] = useState(() => {
    const d = new Date(Date.now() + 7 * 86400000)
    return d.toISOString().split('T')[0]
  })
  const [followUpReason, setFollowUpReason] = useState('Review after 7-day treatment course')

  const deptCode = data?.queue?.department?.code
  useSocket({
    on: {
      'queue:updated': (snap) => snap.department.code === deptCode && reload(true),
      'ticket:called': () => reload(true),
      'ticket:completed': () => reload(true),
    },
  })

  // Pre-fill diagnosis if present on current ticket
  useEffect(() => {
    if (data?.current) {
      setDiagnosis(data.current.diagnosis || '')
      setConsultationNotes(data.current.consultationNotes || '')
      setPrescriptions(data.current.prescriptions || '')
    } else {
      setDiagnosis('')
      setConsultationNotes('')
      setPrescriptions('')
    }
  }, [data?.current?.id])

  const act = async (fn) => {
    setBusy(true)
    setActionError(null)
    try {
      await fn()
      await reload(true)
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Loading message="Entering Doctor Consultation Chamber..." />
  if (error) return <ErrorNote error={error} onRetry={reload} />

  const { queue, current, waiting } = data || { queue: {}, current: null, waiting: [] }
  const me = queue.doctors?.find((d) => d.name === doctor.name)
  const currentState = me?.state || 'available'

  const handleSetStatus = (state, delayMinutes = 0, until = null) => {
    act(() => api.setStatus({ state, delayMinutes, until }))
  }

  const handleCompleteConsultation = async () => {
    if (!current) return
    act(async () => {
      await api.complete(current.id, {
        diagnosis,
        consultationNotes,
        prescriptions,
        followUpDate: needsFollowUp ? followUpDate : undefined,
      })
    })
  }

  return (
    <div className="doctor-shell">
      {/* 1. Doctor Topbar (Focused Chamber Identity) */}
      <header className="doctor-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div className="doctor-brand-crest">
            <Icon name="med" size={22} color="#ffffff" />
          </div>
          <div className="doctor-chamber-meta">
            <span className="doctor-chamber-title">{doctor.name}</span>
            <span className="doctor-chamber-sub">
              {doctor.specialty || queue.department?.name || 'General Medicine'} • Chamber {doctor.room || 'Room 1'}
            </span>
          </div>
        </div>

        <div className="doctor-topbar__right">
          {/* Presence State Toggle Pills */}
          <div className="doctor-status-pill-group">
            <button
              type="button"
              className={`btn-status-toggle btn-status-toggle--available ${
                currentState === 'available' ? 'btn-status-toggle--active' : ''
              }`}
              disabled={busy}
              onClick={() => handleSetStatus('available')}
            >
              ● In Chamber
            </button>
            <button
              type="button"
              className={`btn-status-toggle ${currentState === 'on_break' ? 'btn-status-toggle--active' : ''}`}
              disabled={busy}
              onClick={() =>
                handleSetStatus('on_break', 0, new Date(Date.now() + 15 * 60000).toISOString())
              }
            >
              ☕ Break (15m)
            </button>
            <button
              type="button"
              className={`btn-status-toggle ${currentState === 'running_late' ? 'btn-status-toggle--active' : ''}`}
              disabled={busy}
              onClick={() => handleSetStatus('running_late', 15)}
            >
              ⏳ Late (15m)
            </button>
          </div>

          <Link to="/admin" className="btn-action-sm" title="Open Hospital Admin Overview">
            <Icon name="hospital-building" size={14} />
            <span>Admin Desk</span>
          </Link>

          <button
            type="button"
            className="btn-action-sm"
            onClick={onSignOut}
            title="Switch Doctor Chamber"
          >
            <Icon name="arrow-right" size={14} />
            <span>Switch Doctor</span>
          </button>
        </div>
      </header>

      {/* 2. Main Doctor Workspace */}
      <main className="doctor-workspace">
        {/* Left Column: Current Patient in Examination Room */}
        <section className="doctor-clinical-card">
          <div className="consultation-active-header">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>
                Active Patient Consultation
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Examine, diagnose, prescribe, and schedule follow-up
              </span>
            </div>

            {current && <ConsultTimer since={current.calledAt || Date.now()} />}
          </div>

          <ErrorNote error={actionError} />

          {current ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Token & Patient Bio Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span className="consultation-token-badge">{current.tokenNumber}</span>
                    <div>
                      <strong style={{ fontSize: '1.2rem', color: '#0f172a' }}>
                        {current.patient?.firstName} {current.patient?.lastName || ''}
                      </strong>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        {current.patient?.age} Years •{' '}
                        <span style={{ textTransform: 'capitalize' }}>{current.patient?.gender}</span> • Phone:{' '}
                        {current.patient?.mobile || '555-0100'}
                      </div>
                    </div>
                  </div>
                </div>

                {current.isEmergency && (
                  <span
                    style={{
                      background: '#fee2e2',
                      color: '#b91c1c',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                    }}
                  >
                    EMERGENCY 108
                  </span>
                )}
              </div>

              {/* What the patient came in for (Chief Complaint / Symptoms) */}
              <div className="patient-symptom-quote">
                <strong>Chief Complaint / Patient Symptoms:</strong>
                <span>“{current.complaint || 'Patient reported mild fever and bodily fatigue at registration counter.'}”</span>
              </div>

              {/* Doctor Clinical Diagnosis Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                    Clinical Diagnosis *
                  </label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g. Acute Bronchitis, Mild Hypertension, Viral Pharyngitis"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                    Examination Findings & Doctor Clinical Notes
                  </label>
                  <textarea
                    rows={3}
                    className="form-control"
                    placeholder="Physical examination observations, vitals, chest auscultation, throat inspection..."
                    value={consultationNotes}
                    onChange={(e) => setConsultationNotes(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                    Prescriptions & Advice
                  </label>
                  <textarea
                    rows={2}
                    className="form-control"
                    placeholder="e.g. 1. Tab Paracetamol 650mg TDS x 3 days&#10;2. Inhaler Levolin 2 puffs BD"
                    value={prescriptions}
                    onChange={(e) => setPrescriptions(e.target.value)}
                  />
                </div>

                {/* Doctor Scheduled Follow-up Order */}
                <div className="followup-order-box">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="followup-order-title">
                      <Icon name="clock" size={16} />
                      <span>Doctor-Prescribed Follow-up Visit</span>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={needsFollowUp}
                        onChange={(e) => setNeedsFollowUp(e.target.checked)}
                      />
                      <span>Schedule Follow-up</span>
                    </label>
                  </div>

                  {needsFollowUp && (
                    <div className="form-grid-2col" style={{ marginTop: '0.25rem' }}>
                      <div className="form-group">
                        <label style={{ fontSize: '0.78rem' }}>Next Review Date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label style={{ fontSize: '0.78rem' }}>Follow-up Clinical Purpose</label>
                        <input
                          type="text"
                          className="form-control"
                          value={followUpReason}
                          onChange={(e) => setFollowUpReason(e.target.value)}
                          placeholder="e.g. Review after treatment"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Main Action: Complete & Save Diagnosis */}
                <button
                  type="button"
                  disabled={busy || !diagnosis.trim()}
                  className="btn-complete-consultation"
                  onClick={handleCompleteConsultation}
                >
                  <Icon name="check" size={18} />
                  <span>Complete Consultation & Save Diagnosis</span>
                </button>

                {/* Secondary Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn--subtle"
                    disabled={busy}
                    onClick={() => act(() => api.requeue(current.id))}
                  >
                    <Icon name="clock" size={14} />
                    <span>Requeue</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn--subtle"
                    disabled={busy}
                    onClick={() => act(() => api.noShow(current.id))}
                  >
                    <Icon name="close" size={14} />
                    <span>Mark No-Show</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn--subtle"
                    disabled={busy}
                    onClick={() => setTransferOpen(true)}
                  >
                    <Icon name="arrow-right" size={14} />
                    <span>Transfer Dept</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="chamber-empty-box">
              <div className="chamber-empty-icon">
                <Icon name="doctor" size={32} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>
                  Chamber Ready for Examination
                </h3>
                <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                  {waiting.length} patient{waiting.length !== 1 ? 's' : ''} currently waiting outside in the queue.
                </p>
              </div>

              <button
                type="button"
                disabled={busy}
                className="btn-call-next-lg"
                onClick={() => act(() => api.callNext())}
              >
                <Icon name="speaker" size={20} />
                <span>
                  Call Next Patient ({waiting[0]?.tokenNumber || 'Next in Queue'})
                </span>
              </button>
            </div>
          )}
        </section>

        {/* Right Column: Waiting Line Outside My Chamber */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Waiting Queue Card */}
          <div className="mediflow-white-box">
            <div className="mediflow-box-header">
              <h2>Waiting Outside My Chamber ({waiting.length})</h2>
              {waiting.length > 0 && !current && (
                <button
                  type="button"
                  disabled={busy}
                  className="btn-action-sm btn-action-primary"
                  onClick={() => act(() => api.callNext())}
                >
                  <Icon name="speaker" size={14} />
                  <span>Call Next</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {waiting.length === 0 ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem' }}>
                  No patients waiting in queue outside chamber.
                </div>
              ) : (
                waiting.map((p) => (
                  <div key={p.id} className="doctor-waiting-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                      <span className="doctor-token-sm">{p.tokenNumber}</span>
                      <div>
                        <strong style={{ fontSize: '0.92rem', color: '#0f172a', display: 'block' }}>
                          {p.patient.firstName}, {p.patient.age}y
                        </strong>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {p.complaint ? `“${p.complaint}”` : 'Routine consultation'}
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {minutesSince(p.createdAt)}m wait
                      </span>
                      {p.isEmergency && (
                        <div style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 700 }}>
                          EMERGENCY
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Department Transfer Modal */}
          <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="Transfer Patient to Another Department">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem 0' }}>
              {list
                .filter((d) => d.code !== deptCode)
                .map((d) => (
                  <button
                    key={d.code}
                    type="button"
                    className="btn btn--subtle"
                    style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.75rem 1rem' }}
                    disabled={busy}
                    onClick={() => {
                      setTransferOpen(false)
                      act(() => api.transfer(current.id, d.code))
                    }}
                  >
                    <strong>{d.name}</strong> • Floor {d.floor} ({d.code})
                  </button>
                ))}
            </div>
          </Modal>
        </section>
      </main>
    </div>
  )
}

/** Doctor Chamber Selector */
function DoctorChamberSelector({ onSelectDoctor }) {
  const DOCTOR_CHAMBERS = [
    { name: 'Dr. Anita Sharma', email: 'anita@queuemitra.test', specialty: 'Internal Medicine', room: 'Room 1' },
    { name: 'Dr. Sunita Rao', email: 'sunita@queuemitra.test', specialty: 'Obstetrics & Gynaecology', room: 'Room 4' },
    { name: 'Dr. Meena Iyer', email: 'meena@queuemitra.test', specialty: 'Pediatrics & Child Care', room: 'Room 3' },
    { name: 'Dr. Imran Khan', email: 'imran@queuemitra.test', specialty: 'Orthopedic Surgery', room: 'Room 5' },
    { name: 'Dr. Priya Nair', email: 'priya@queuemitra.test', specialty: 'ENT Specialist', room: 'Room 6' },
    { name: 'Dr. Arjun Mehta', email: 'arjun@queuemitra.test', specialty: 'Ophthalmology', room: 'Room 7' },
    { name: 'Dr. Kavita Joshi', email: 'kavita@queuemitra.test', specialty: 'Dermatology', room: 'Room 8' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: 52, height: 52, borderRadius: '14px', background: '#0284c7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <Icon name="med" size={26} color="#ffffff" />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a', fontWeight: 800 }}>
            Doctor Consultation Chamber
          </h1>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: '#64748b' }}>
            Select your assigned clinical chamber to manage your patients & diagnoses.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {DOCTOR_CHAMBERS.map((doc) => (
            <button
              key={doc.email}
              type="button"
              className="btn btn--subtle"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.9rem 1.15rem',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                textAlign: 'left',
                cursor: 'pointer',
              }}
              onClick={() => onSelectDoctor(doc)}
            >
              <div>
                <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block' }}>
                  {doc.name}
                </strong>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {doc.specialty} • Chamber {doc.room}
                </span>
              </div>
              <span className="token-badge-blue" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                ENTER
              </span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
          <Link to="/admin" style={{ fontSize: '0.85rem', color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}>
            ← Return to MediFlow Admin Overview
          </Link>
        </div>
      </div>
    </div>
  )
}
