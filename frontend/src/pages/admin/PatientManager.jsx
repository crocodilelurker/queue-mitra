import { useState, useEffect } from 'react'
import AdminLayout from './AdminLayout.jsx'
import { api } from '../../api/client.js'
import { useAsync } from '../../hooks/useAsync.js'
import { Loading, ErrorNote } from '../../components/common/Status.jsx'
import { Icon } from '../../components/common/Icons.jsx'
import Modal from '../../components/common/Modal.jsx'
import { useLocation, navigate } from '../../router.jsx'

const AVATAR_COLORS = ['avatar--teal', 'avatar--cyan', 'avatar--mint', 'avatar--amber', 'avatar--purple']

export default function PatientManager() {
  const { search } = useLocation()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [activeProfileId, setActiveProfileId] = useState(null)
  const [patientProfile, setPatientProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)

  // Fetch patient list
  const { data: patients, loading, error, reload } = useAsync(
    () => api.patients(activeSearch),
    [activeSearch]
  )

  useEffect(() => {
    const params = new URLSearchParams(search)
    if (params.get('register') === '1') setIsRegisterOpen(true)
    const pid = params.get('profile')
    if (pid) handleOpenProfile(pid)
    const s = params.get('search')
    if (s) {
      setSearchTerm(s)
      setActiveSearch(s)
    }
  }, [search])

  const handleSearchSubmit = (e) => {
    e?.preventDefault()
    setActiveSearch(searchTerm)
  }

  const handleOpenProfile = async (patientId) => {
    setActiveProfileId(patientId)
    setProfileLoading(true)
    try {
      const res = await api.patientProfile(patientId)
      setPatientProfile(res)
    } catch (err) {
      alert('Failed to load patient profile: ' + err.message)
    } finally {
      setProfileLoading(false)
    }
  }

  return (
    <AdminLayout>
      {/* 1. Page Header (Screenshot 1: Patients & count) */}
      <div className="mediflow-page-header">
        <div>
          <h1 className="mediflow-page-title">Patients</h1>
          <p className="mediflow-page-subtitle">
            {patients ? `${patients.length} patients shown` : 'Loading patients...'}
          </p>
        </div>

        <button
          type="button"
          className="btn-action-primary-teal"
          onClick={() => setIsRegisterOpen(true)}
        >
          <Icon name="plus" size={16} />
          <span>Register Patient</span>
        </button>
      </div>

      {/* 2. Search Row (Screenshot 1: Search input + Search button) */}
      <form onSubmit={handleSearchSubmit} className="mediflow-search-bar-row">
        <input
          type="text"
          className="mediflow-search-bar-input"
          placeholder="Search by name, patient ID or phone number"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button type="submit" className="btn-teal-search">
          <Icon name="search" size={16} />
          <span>Search</span>
        </button>
        {activeSearch && (
          <button
            type="button"
            className="btn btn--subtle"
            onClick={() => {
              setSearchTerm('')
              setActiveSearch('')
            }}
          >
            Clear
          </button>
        )}
      </form>

      {/* 3. Patient Cards List (Screenshot 1) */}
      {loading ? (
        <div style={{ padding: '3rem 0' }}>
          <Loading message="Loading patients list..." />
        </div>
      ) : error ? (
        <div style={{ padding: '1rem 0' }}>
          <ErrorNote error={error} onRetry={reload} />
        </div>
      ) : !patients || patients.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '3rem',
            textAlign: 'center',
            color: '#64748b',
          }}
        >
          No patients found matching your search. Click "Register Patient" to add one.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {patients.map((p, idx) => {
            const initials = `${p.firstName?.[0] || 'P'}${p.lastName?.[0] || ''}`.toUpperCase()
            const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length]
            const ageDisplay = p.age ? `${p.age} yrs` : 'Age N/A'
            const genderDisplay = p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : 'Female'
            const bloodDisplay = p.bloodGroup ? ` - ${p.bloodGroup}` : ''

            return (
              <div key={p._id || p.patientId} className="patient-card-item">
                <div className="patient-card-left">
                  <div className={`patient-avatar-circle ${colorClass}`}>
                    {initials}
                  </div>
                  <div className="patient-card-info">
                    <span className="patient-card-name">
                      {p.firstName} {p.lastName}
                    </span>
                    <span className="patient-card-sub">
                      {p.patientId} - {ageDisplay} - {genderDisplay}{bloodDisplay}
                    </span>
                  </div>
                </div>

                <div className="patient-card-right">
                  <div className="patient-phone-display">
                    <Icon name="phone" size={15} color="#64748b" />
                    <span>{p.mobile || '555-0100'}</span>
                  </div>

                  <button
                    type="button"
                    className="btn-card-action"
                    onClick={() => handleOpenProfile(p.patientId)}
                  >
                    <Icon name="eye" size={14} />
                    <span>Profile</span>
                  </button>

                  <button
                    type="button"
                    className="btn-card-action"
                    onClick={() =>
                      navigate(
                        `/admin/appointments?book=1&patientId=${p.patientId}&name=${encodeURIComponent(
                          `${p.firstName} ${p.lastName}`
                        )}&mobile=${p.mobile}`
                      )
                    }
                  >
                    <span>Book</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 4. Patient Registration Modal */}
      {isRegisterOpen && (
        <RegistrationModal
          onClose={() => setIsRegisterOpen(false)}
          onSuccess={(newPatient) => {
            setIsRegisterOpen(false)
            reload(true)
            handleOpenProfile(newPatient.patientId)
          }}
        />
      )}

      {/* 5. Patient Profile & Medical History Drawer */}
      {activeProfileId && (
        <div className="patient-drawer-backdrop" onClick={() => setActiveProfileId(null)}>
          <div className="patient-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>Patient Medical Profile</h3>
                <span className="profile-id-badge" style={{ marginTop: '0.25rem' }}>{activeProfileId}</span>
              </div>
              <button
                type="button"
                className="btn-action-sm"
                onClick={() => setActiveProfileId(null)}
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="drawer-content">
              {profileLoading ? (
                <Loading message="Fetching complete patient medical records..." />
              ) : patientProfile ? (
                <>
                  <div className="patient-profile-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>
                          {patientProfile.patient.firstName} {patientProfile.patient.lastName}
                        </h4>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          {patientProfile.patient.gender?.toUpperCase()} • {patientProfile.patient.age} Years Old
                        </div>
                      </div>
                      <div
                        style={{
                          background: '#fee2e2',
                          color: '#b91c1c',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '8px',
                        }}
                      >
                        Blood: {patientProfile.patient.bloodGroup || 'Unknown'}
                      </div>
                    </div>

                    <div className="info-grid-2col" style={{ marginTop: '0.5rem' }}>
                      <div>
                        <div className="info-field-label">Mobile Number</div>
                        <div className="info-field-val">{patientProfile.patient.mobile}</div>
                      </div>
                      <div>
                        <div className="info-field-label">Total Visits</div>
                        <div className="info-field-val">{patientProfile.patient.visitCount || 1}</div>
                      </div>
                      <div>
                        <div className="info-field-label">Location / City</div>
                        <div className="info-field-val">
                          {patientProfile.patient.address?.city || 'District Central'}
                        </div>
                      </div>
                      <div>
                        <div className="info-field-label">Emergency Contact</div>
                        <div className="info-field-val">
                          {patientProfile.patient.emergencyContact?.name || 'N/A'} (
                          {patientProfile.patient.emergencyContact?.relation || 'Guardian'})
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn-action-primary-teal"
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={() => {
                          setActiveProfileId(null)
                          navigate(
                            `/admin/appointments?book=1&patientId=${patientProfile.patient.patientId}&name=${encodeURIComponent(
                              `${patientProfile.patient.firstName} ${patientProfile.patient.lastName}`
                            )}&mobile=${patientProfile.patient.mobile}`
                          )
                        }}
                      >
                        <Icon name="calendar" size={16} />
                        <span>Schedule Appointment for Patient</span>
                      </button>
                    </div>
                  </div>

                  {/* Visit History */}
                  <div>
                    <h4 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: '#0f172a' }}>
                      Visit History & Diagnoses ({patientProfile.appointments?.length || 0})
                    </h4>
                    {patientProfile.appointments?.length === 0 ? (
                      <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                        No past consultations recorded.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {patientProfile.appointments.map((apt) => (
                          <div
                            key={apt._id}
                            style={{
                              border: '1px solid #e2e8f0',
                              borderRadius: '10px',
                              padding: '0.85rem',
                              background: '#ffffff',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                              <strong>{apt.appointmentDate} • {apt.slotTime}</strong>
                              <span className={`status-pill status-pill--${apt.status}`}>
                                {apt.status}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                              <strong>Doctor:</strong> {apt.doctorName || 'Duty Physician'} (
                              <span style={{ textTransform: 'capitalize' }}>{apt.departmentCode}</span>)
                            </div>
                            {apt.diagnosis && (
                              <div style={{ fontSize: '0.85rem', color: '#0f172a', marginTop: '0.25rem' }}>
                                <strong>Diagnosis:</strong> {apt.diagnosis}
                              </div>
                            )}
                            {apt.followUpDate && (
                              <div style={{ fontSize: '0.8rem', color: '#0d9488', marginTop: '0.25rem', fontWeight: 600 }}>
                                Follow-up: {apt.followUpDate} (SMS Reminder Scheduled)
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

/** Registration Modal */
function RegistrationModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: 'female',
    age: '24',
    mobile: '',
    bloodGroup: 'B+',
    city: 'District Central',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelation: 'Spouse',
  })
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErr(null)
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        gender: formData.gender,
        age: Number(formData.age),
        mobile: formData.mobile,
        bloodGroup: formData.bloodGroup,
        address: { city: formData.city },
        emergencyContact: {
          name: formData.emergencyName || 'Guardian',
          phone: formData.emergencyPhone || formData.mobile,
          relation: formData.emergencyRelation,
        },
      }
      const res = await api.registerPatient(payload)
      onSuccess(res)
    } catch (error) {
      setErr(error.message || 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <h3 className="modal__title" style={{ margin: 0 }}>Register Patient</h3>
          <p className="modal__lead" style={{ margin: '0.2rem 0 0' }}>
            Generates unique MediFlow ID (CDH-P-XXXX) and digital profile.
          </p>
        </div>

        {err && <div className="note note--danger">{err}</div>}

        <div className="form-grid-2col">
          <div className="form-group">
            <label>First Name *</label>
            <input
              type="text"
              required
              className="form-control"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="e.g. Tara"
            />
          </div>
          <div className="form-group">
            <label>Last Name *</label>
            <input
              type="text"
              required
              className="form-control"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="e.g. Menon"
            />
          </div>
        </div>

        <div className="form-grid-2col">
          <div className="form-group">
            <label>Gender *</label>
            <select
              className="form-control"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Age (Years) *</label>
            <input
              type="number"
              required
              className="form-control"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              placeholder="e.g. 5"
            />
          </div>
        </div>

        <div className="form-grid-2col">
          <div className="form-group">
            <label>Phone Number *</label>
            <input
              type="tel"
              required
              pattern="[0-9]{10}"
              className="form-control"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              placeholder="9876543210"
            />
          </div>
          <div className="form-group">
            <label>Blood Group</label>
            <select
              className="form-control"
              value={formData.bloodGroup}
              onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
            >
              <option value="O+">O+</option>
              <option value="A+">A+</option>
              <option value="B+">B+</option>
              <option value="AB+">AB+</option>
              <option value="O-">O-</option>
              <option value="A-">A-</option>
              <option value="B-">B-</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button type="button" className="btn btn--subtle" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn-action-primary-teal"
            disabled={submitting}
          >
            {submitting ? 'Registering...' : 'Register Patient'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
