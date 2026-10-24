import { useState, useEffect } from 'react'
import AdminLayout from './AdminLayout.jsx'
import { api } from '../../api/client.js'
import { useAsync } from '../../hooks/useAsync.js'
import { Loading, ErrorNote } from '../../components/common/Status.jsx'
import { Icon } from '../../components/common/Icons.jsx'
import Modal from '../../components/common/Modal.jsx'
import { useLocation, navigate } from '../../router.jsx'

export default function PatientManager() {
  const { search } = useLocation()
  const [searchTerm, setSearchTerm] = useState('')
  const [bloodFilter, setBloodFilter] = useState('')
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [activeProfileId, setActiveProfileId] = useState(null)
  const [patientProfile, setPatientProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)

  // Fetch patient list
  const { data: patients, loading, error, reload } = useAsync(
    () => api.patients(searchTerm),
    [searchTerm]
  )

  // Check URL query parameters (e.g. ?register=1)
  useEffect(() => {
    const params = new URLSearchParams(search)
    if (params.get('register') === '1') {
      setIsRegisterOpen(true)
    }
    const pid = params.get('profile')
    if (pid) {
      handleOpenProfile(pid)
    }
  }, [search])

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

  // Filter patients by blood group if set
  const filteredPatients = (patients || []).filter((p) => {
    if (bloodFilter && p.bloodGroup !== bloodFilter) return false
    return true
  })

  return (
    <AdminLayout>
      <div className="admin-section-header">
        <div>
          <h2>
            <Icon name="users" size={22} color="var(--primary)" />
            <span>Patient Management & Hospital Registry</span>
          </h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
            Digital records replacing paper OPD registration slips (0:45 - 2:03)
          </div>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => setIsRegisterOpen(true)}
        >
          <Icon name="plus" size={16} />
          <span>New Patient Registration</span>
        </button>
      </div>

      {/* Patient Directory Table & Filters */}
      <div className="admin-table-container">
        <div className="admin-table-toolbar">
          <div className="admin-search-box">
            <Icon name="search" size={16} color="var(--ink-muted)" />
            <input
              type="text"
              placeholder="Search by Patient ID, Name, or Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <select
              className="form-control"
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
              value={bloodFilter}
              onChange={(e) => setBloodFilter(e.target.value)}
            >
              <option value="">All Blood Groups</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>

            <button type="button" className="btn-action-sm" onClick={() => reload(true)}>
              <Icon name="refresh" size={14} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem' }}>
            <Loading message="Loading patients list..." />
          </div>
        ) : error ? (
          <div style={{ padding: '2rem' }}>
            <ErrorNote error={error} onRetry={reload} />
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Full Name</th>
                <th>Age / Gender</th>
                <th>Phone Number</th>
                <th>Blood Group</th>
                <th>Visits</th>
                <th>Emergency Contact</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--ink-muted)' }}>
                    No patient records found matching your query. Click "New Patient Registration" to add one.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <span className="profile-id-badge">{p.patientId}</span>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--ink)', fontSize: '0.95rem' }}>
                        {p.firstName} {p.lastName}
                      </strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
                        {p.address?.city || 'District Central'}
                      </div>
                    </td>
                    <td>
                      {p.age ? `${p.age} yrs` : '—'} /{' '}
                      <span style={{ textTransform: 'capitalize' }}>{p.gender}</span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace' }}>{p.mobile}</span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: p.bloodGroup ? 'var(--danger)' : 'var(--ink-muted)',
                        }}
                      >
                        {p.bloodGroup || '—'}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          background: 'var(--surface-subtle)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: 'var(--radius-xs)',
                          fontWeight: 600,
                        }}
                      >
                        {p.visitCount || 1}
                      </span>
                    </td>
                    <td>
                      {p.emergencyContact?.name ? (
                        <div style={{ fontSize: '0.8rem' }}>
                          <span style={{ fontWeight: 600 }}>{p.emergencyContact.name}</span>
                          <span style={{ color: 'var(--ink-muted)' }}> ({p.emergencyContact.relation})</span>
                          <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                            {p.emergencyContact.phone}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--ink-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          className="btn-action-sm btn-action-primary"
                          onClick={() => handleOpenProfile(p.patientId)}
                        >
                          <Icon name="clipboard" size={13} />
                          <span>History</span>
                        </button>
                        <button
                          type="button"
                          className="btn-action-sm"
                          onClick={() =>
                            navigate(
                              `/admin/appointments?book=1&patientId=${p.patientId}&name=${encodeURIComponent(
                                `${p.firstName} ${p.lastName}`
                              )}&mobile=${p.mobile}`
                            )
                          }
                          title="Book an OPD Appointment for this patient"
                        >
                          <Icon name="calendar" size={13} />
                          <span>Book</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Patient Registration Modal (1:09 - 2:03) */}
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

      {/* Patient Profile & Visit History Drawer (1:09 - 2:03) */}
      {activeProfileId && (
        <div className="patient-drawer-backdrop" onClick={() => setActiveProfileId(null)}>
          <div className="patient-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--ink)' }}>Patient Medical Profile</h3>
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
                  {/* Demographic Summary */}
                  <div className="patient-profile-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--ink)' }}>
                          {patientProfile.patient.firstName} {patientProfile.patient.lastName}
                        </h4>
                        <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
                          {patientProfile.patient.gender?.toUpperCase()} • {patientProfile.patient.age} Years Old
                        </div>
                      </div>
                      <div
                        style={{
                          background: 'var(--danger-bg)',
                          border: '1px solid var(--danger-border)',
                          color: 'var(--danger)',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          padding: '0.3rem 0.6rem',
                          borderRadius: 'var(--radius-sm)',
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
                        <div className="info-field-label">Total OPD Visits</div>
                        <div className="info-field-val">{patientProfile.patient.visitCount || 1}</div>
                      </div>
                      <div>
                        <div className="info-field-label">Address / Location</div>
                        <div className="info-field-val">
                          {patientProfile.patient.address?.street || 'Central Dist'},{' '}
                          {patientProfile.patient.address?.city || 'Ward 4'}
                        </div>
                      </div>
                      <div>
                        <div className="info-field-label">Emergency Contact</div>
                        <div className="info-field-val">
                          {patientProfile.patient.emergencyContact?.name || 'N/A'} (
                          {patientProfile.patient.emergencyContact?.relation || 'Guardian'}) -{' '}
                          {patientProfile.patient.emergencyContact?.phone || ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn--primary"
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
                        <span>Book Follow-up / New OPD Visit</span>
                      </button>
                    </div>
                  </div>

                  {/* Visit History Section */}
                  <div>
                    <h4 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: 'var(--ink)' }}>
                      OPD Visit History & Diagnoses ({patientProfile.appointments?.length || 0})
                    </h4>
                    {patientProfile.appointments?.length === 0 ? (
                      <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
                        No past doctor consultations recorded.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {patientProfile.appointments.map((apt) => (
                          <div
                            key={apt._id}
                            style={{
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '0.85rem',
                              background: 'var(--surface)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                              <strong>{apt.appointmentDate} • {apt.slotTime}</strong>
                              <span className={`status-pill status-pill--${apt.status}`}>
                                {apt.status}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
                              <strong>Doctor:</strong> {apt.doctorName || 'Duty Physician'} (
                              <span style={{ textTransform: 'capitalize' }}>{apt.departmentCode}</span>)
                            </div>
                            {apt.diagnosis && (
                              <div style={{ fontSize: '0.85rem', color: 'var(--ink)', marginTop: '0.25rem' }}>
                                <strong>Diagnosis:</strong> {apt.diagnosis}
                              </div>
                            )}
                            {apt.consultationNotes && (
                              <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: '0.2rem' }}>
                                <em>Notes: {apt.consultationNotes}</em>
                              </div>
                            )}
                            {apt.followUpDate && (
                              <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '0.25rem', fontWeight: 600 }}>
                                Follow-up: {apt.followUpDate} (SMS Reminder Scheduled)
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Billing Invoices Ledger */}
                  <div>
                    <h4 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: 'var(--ink)' }}>
                      Billing & Subsidies Ledger ({patientProfile.bills?.length || 0})
                    </h4>
                    {patientProfile.bills?.length === 0 ? (
                      <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>No billing records.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {patientProfile.bills.map((bill) => (
                          <div
                            key={bill._id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.65rem 0.85rem',
                              background: 'var(--surface-subtle)',
                              borderRadius: 'var(--radius-xs)',
                              fontSize: '0.85rem',
                            }}
                          >
                            <div>
                              <strong style={{ fontFamily: 'monospace' }}>{bill.invoiceNumber}</strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
                                Fee: ₹{bill.fee} | Net: ₹{bill.netAmount}
                              </div>
                            </div>
                            <span className={`status-pill status-pill--${bill.paymentStatus}`}>
                              {bill.paymentStatus}
                            </span>
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

/** Registration Form Modal */
function RegistrationModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: 'male',
    dob: '',
    age: '',
    mobile: '',
    bloodGroup: 'O+',
    street: '',
    city: 'Central District',
    pin: '500001',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelation: 'Spouse',
  })
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState(null)

  const handleDobChange = (e) => {
    const dobVal = e.target.value
    setFormData((prev) => {
      let computedAge = prev.age
      if (dobVal) {
        const birthDate = new Date(dobVal)
        const diff = Date.now() - birthDate.getTime()
        computedAge = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
      }
      return { ...prev, dob: dobVal, age: computedAge >= 0 ? computedAge : '' }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErr(null)
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        gender: formData.gender,
        dob: formData.dob || undefined,
        age: Number(formData.age) || undefined,
        mobile: formData.mobile,
        bloodGroup: formData.bloodGroup,
        address: {
          street: formData.street,
          city: formData.city,
          pin: formData.pin,
        },
        emergencyContact: {
          name: formData.emergencyName,
          phone: formData.emergencyPhone,
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
          <h3 className="modal__title" style={{ margin: 0 }}>Patient OPD Registration</h3>
          <p className="modal__lead" style={{ margin: '0.2rem 0 0' }}>
            Generates unique Hospital Patient ID (`CDH-P-XXXX`) and digital record.
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
              placeholder="e.g. Ramesh"
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
              placeholder="e.g. Sharma"
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
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Blood Group</label>
            <select
              className="form-control"
              value={formData.bloodGroup}
              onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
            >
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>
        </div>

        <div className="form-grid-2col">
          <div className="form-group">
            <label>Date of Birth</label>
            <input
              type="date"
              className="form-control"
              value={formData.dob}
              onChange={handleDobChange}
            />
          </div>

          <div className="form-group">
            <label>Age (Years) *</label>
            <input
              type="number"
              required
              min="0"
              max="130"
              className="form-control"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              placeholder="e.g. 42"
            />
          </div>
        </div>

        <div className="form-grid-2col">
          <div className="form-group">
            <label>Mobile Number (10 digits) *</label>
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
            <label>City / District</label>
            <input
              type="text"
              className="form-control"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>
        </div>

        {/* Emergency Contact */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
          <strong style={{ fontSize: '0.85rem', color: 'var(--ink)' }}>Emergency Contact Details</strong>
          <div className="form-grid-2col" style={{ marginTop: '0.5rem' }}>
            <div className="form-group">
              <label>Contact Person Name</label>
              <input
                type="text"
                className="form-control"
                value={formData.emergencyName}
                onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                placeholder="Relative or guardian"
              />
            </div>
            <div className="form-group">
              <label>Relationship</label>
              <select
                className="form-control"
                value={formData.emergencyRelation}
                onChange={(e) => setFormData({ ...formData, emergencyRelation: e.target.value })}
              >
                <option value="Spouse">Spouse</option>
                <option value="Parent">Parent</option>
                <option value="Child">Child</option>
                <option value="Sibling">Sibling</option>
                <option value="Friend">Friend</option>
                <option value="Guardian">Guardian</option>
              </select>
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '0.5rem' }}>
            <label>Emergency Phone</label>
            <input
              type="tel"
              className="form-control"
              value={formData.emergencyPhone}
              onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
              placeholder="10-digit number"
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
          <button type="button" className="btn btn--subtle" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Registering...' : 'Complete Registration'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
