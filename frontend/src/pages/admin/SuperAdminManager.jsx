import { useState } from 'react'
import AdminLayout from './AdminLayout.jsx'
import { api } from '../../api/client.js'
import { useAsync } from '../../hooks/useAsync.js'
import { Loading, ErrorNote } from '../../components/common/Status.jsx'
import { Icon } from '../../components/common/Icons.jsx'
import Modal from '../../components/common/Modal.jsx'
import { useDepartments } from '../../api/departments.js'

export default function SuperAdminManager() {
  const [activeTab, setActiveTab] = useState('doctors') // 'doctors' | 'staff' | 'patients' | 'system'
  const { list: departments } = useDepartments()

  // Data queries
  const { data: doctorsData, reload: reloadDoctors } = useAsync(() => api.adminDoctors(), [])
  const { data: staffData, reload: reloadStaff } = useAsync(() => api.adminStaff(), [])
  const { data: patientsData, reload: reloadPatients } = useAsync(() => api.patients(''), [])

  const doctorList = Array.isArray(doctorsData) ? doctorsData : doctorsData?.doctors || []
  const staffList = Array.isArray(staffData) ? staffData : staffData?.staff || []
  const patientList = Array.isArray(patientsData) ? patientsData : patientsData?.patients || []

  // Doctor Modals
  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState(null)

  // Staff Modals
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)

  // Patient Modals
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false)
  const [editingPatient, setEditingPatient] = useState(null)

  // Search filters
  const [doctorSearch, setDoctorSearch] = useState('')
  const [staffSearch, setStaffSearch] = useState('')
  const [patientSearch, setPatientSearch] = useState('')

  // Purge state
  const [purging, setPurging] = useState(false)
  const [purgeMsg, setPurgeMsg] = useState(null)

  const reloadAll = () => {
    reloadDoctors(true)
    reloadStaff(true)
    reloadPatients(true)
  }

  // Doctor Handlers
  const handleDeleteDoctor = async (doc) => {
    if (!window.confirm(`Are you sure you want to delete ${doc.name}? This will remove their chamber login.`)) return
    try {
      await api.deleteDoctor(doc._id)
      reloadDoctors(true)
    } catch (err) {
      alert('Delete failed: ' + err.message)
    }
  }

  // Staff Handlers
  const handleDeleteStaff = async (member) => {
    if (!window.confirm(`Are you sure you want to delete staff account ${member.name}?`)) return
    try {
      await api.deleteStaff(member._id)
      reloadStaff(true)
    } catch (err) {
      alert('Delete failed: ' + err.message)
    }
  }

  // Patient Handlers
  const handleDeletePatient = async (p) => {
    if (!window.confirm(`Are you sure you want to delete patient ${p.firstName} ${p.lastName} (${p.patientId})? This will also remove any active tickets and bills.`)) return
    try {
      await api.deletePatient(p.patientId)
      reloadPatients(true)
    } catch (err) {
      alert('Delete failed: ' + err.message)
    }
  }

  // Purge Mock Data Handler
  const handlePurgeMockData = async () => {
    if (!window.confirm('WARNING: This will permanently delete ALL patient records, appointments, bills, and queue tickets from the database. Are you sure?')) return
    setPurging(true)
    setPurgeMsg(null)
    try {
      const res = await api.purgeMockData()
      setPurgeMsg(`Successfully purged! Removed ${res.deleted?.patients || 0} patients, ${res.deleted?.appointments || 0} appointments, ${res.deleted?.bills || 0} bills. Database is completely clean.`)
      reloadAll()
    } catch (err) {
      alert('Purge failed: ' + err.message)
    } finally {
      setPurging(false)
    }
  }

  // Filter lists
  const filteredDoctors = doctorList.filter((d) => {
    const q = doctorSearch.toLowerCase()
    return !q || d.name?.toLowerCase().includes(q) || d.email?.toLowerCase().includes(q) || d.specialty?.toLowerCase().includes(q) || d.room?.toLowerCase().includes(q)
  })

  const filteredStaff = staffList.filter((s) => {
    const q = staffSearch.toLowerCase()
    return !q || s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.role?.toLowerCase().includes(q)
  })

  const filteredPatients = patientList.filter((p) => {
    const q = patientSearch.toLowerCase()
    return !q || p.firstName?.toLowerCase().includes(q) || p.lastName?.toLowerCase().includes(q) || p.patientId?.toLowerCase().includes(q) || p.mobile?.includes(q)
  })

  return (
    <AdminLayout>
      {/* 1. Super Admin Page Header */}
      <div className="mediflow-page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 className="mediflow-page-title">Super-Admin Control Center</h1>
            <span style={{ background: '#fef3c7', color: '#92400e', fontWeight: 800, fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid #fde68a' }}>
              MASTER ACCESS
            </span>
          </div>
          <p className="mediflow-page-subtitle">
            Create, configure, and manage hospital doctors, administrative staff, patient records, and data hygiene.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn--subtle"
            disabled={purging}
            onClick={handlePurgeMockData}
            style={{ color: '#dc2626', borderColor: '#fca5a5' }}
            title="Clean all mock patients, appointments, and bills"
          >
            <Icon name="close" size={15} />
            <span>{purging ? 'Purging...' : 'Purge All Mock Data'}</span>
          </button>
        </div>
      </div>

      {purgeMsg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', padding: '0.85rem 1.25rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon name="check-circle" size={18} color="#166534" />
          <span>{purgeMsg}</span>
        </div>
      )}

      {/* 2. Top Summary KPI Cards */}
      <section className="mediflow-metrics-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="pastel-metric-card pastel-card--blue" onClick={() => setActiveTab('doctors')} style={{ cursor: 'pointer' }}>
          <div className="pastel-card__icon">
            <Icon name="doctor" size={18} />
          </div>
          <div className="pastel-card__value">{doctorList.length}</div>
          <div className="pastel-card__label">Active Doctors</div>
          <div className="pastel-card__sub">Chambers & Consultations</div>
        </div>

        <div className="pastel-metric-card pastel-card--green" onClick={() => setActiveTab('staff')} style={{ cursor: 'pointer' }}>
          <div className="pastel-card__icon">
            <Icon name="users" size={18} />
          </div>
          <div className="pastel-card__value">{staffList.length}</div>
          <div className="pastel-card__label">Staff & Admins</div>
          <div className="pastel-card__sub">Registration & Desks</div>
        </div>

        <div className="pastel-metric-card pastel-card--purple" onClick={() => setActiveTab('patients')} style={{ cursor: 'pointer' }}>
          <div className="pastel-card__icon">
            <Icon name="user" size={18} />
          </div>
          <div className="pastel-card__value">{patientList.length}</div>
          <div className="pastel-card__label">Registered Patients</div>
          <div className="pastel-card__sub">Master Registry</div>
        </div>

        <div className="pastel-metric-card pastel-card--teal" onClick={() => setActiveTab('system')} style={{ cursor: 'pointer' }}>
          <div className="pastel-card__icon">
            <Icon name="sparkles" size={18} />
          </div>
          <div className="pastel-card__value">{patientList.length === 0 ? 'Clean' : 'Active'}</div>
          <div className="pastel-card__label">Database State</div>
          <div className="pastel-card__sub">{patientList.length === 0 ? '0 Mock Data' : `${patientList.length} Records`}</div>
        </div>
      </section>

      {/* 3. Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('doctors')}
          style={{
            padding: '0.65rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: 'pointer',
            color: activeTab === 'doctors' ? 'var(--primary)' : 'var(--ink-muted)',
            borderBottom: activeTab === 'doctors' ? '3px solid var(--primary)' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Icon name="doctor" size={16} />
          <span>Doctors & Clinicians ({doctorList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('staff')}
          style={{
            padding: '0.65rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: 'pointer',
            color: activeTab === 'staff' ? 'var(--primary)' : 'var(--ink-muted)',
            borderBottom: activeTab === 'staff' ? '3px solid var(--primary)' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Icon name="users" size={16} />
          <span>Staff & Administration ({staffList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('patients')}
          style={{
            padding: '0.65rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: 'pointer',
            color: activeTab === 'patients' ? 'var(--primary)' : 'var(--ink-muted)',
            borderBottom: activeTab === 'patients' ? '3px solid var(--primary)' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Icon name="user" size={16} />
          <span>Patient Registry ({patientList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('system')}
          style={{
            padding: '0.65rem 1.25rem',
            border: 'none',
            background: 'none',
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: 'pointer',
            color: activeTab === 'system' ? 'var(--primary)' : 'var(--ink-muted)',
            borderBottom: activeTab === 'system' ? '3px solid var(--primary)' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Icon name="sparkles" size={16} />
          <span>System & Data Hygiene</span>
        </button>
      </div>

      {/* 4. TAB CONTENT */}

      {/* TAB 1: DOCTORS */}
      {activeTab === 'doctors' && (
        <div className="admin-table-container">
          <div className="admin-table-toolbar">
            <div className="admin-search-box">
              <Icon name="search" size={16} color="var(--ink-muted)" />
              <input
                type="text"
                placeholder="Search doctors by name, specialty, room..."
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn-action-primary-teal"
              onClick={() => setIsAddDoctorOpen(true)}
            >
              <Icon name="plus" size={16} />
              <span>Add New Doctor</span>
            </button>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Department</th>
                <th>Chamber Room</th>
                <th>Specialty</th>
                <th>Consultation Fee</th>
                <th>Live Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    No doctor profiles found. Click "Add New Doctor" to create one.
                  </td>
                </tr>
              ) : (
                filteredDoctors.map((doc) => {
                  const statusStr = typeof doc.status === 'string' ? doc.status : doc.status?.state || 'available'
                  return (
                    <tr key={doc._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#0d9488', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                            {doc.name?.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{doc.name}</strong>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{doc.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="token-badge-blue" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                          {doc.department?.code || 'MED'} · {doc.department?.name || 'General Medicine'}
                        </span>
                      </td>
                      <td><strong>{doc.room || 'Room 1'}</strong></td>
                      <td>{doc.specialty || 'General Medicine'}</td>
                      <td><strong>₹{doc.consultationFee ?? 20}</strong></td>
                      <td>
                        <span className={statusStr === 'available' ? 'badge-completed' : 'badge-inprogress'} style={{ fontSize: '0.75rem' }}>
                          ● {statusStr}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button
                            type="button"
                            className="btn btn--subtle"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                            onClick={() => setEditingDoctor(doc)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn--subtle"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', color: '#dc2626' }}
                            onClick={() => handleDeleteDoctor(doc)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: STAFF & ADMINS */}
      {activeTab === 'staff' && (
        <div className="admin-table-container">
          <div className="admin-table-toolbar">
            <div className="admin-search-box">
              <Icon name="search" size={16} color="var(--ink-muted)" />
              <input
                type="text"
                placeholder="Search staff by name, email, role..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn-action-primary-teal"
              onClick={() => setIsAddStaffOpen(true)}
            >
              <Icon name="plus" size={16} />
              <span>Add Staff Member</span>
            </button>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Personnel</th>
                <th>Role</th>
                <th>Department</th>
                <th>Joined Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    No staff members found.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => (
                  <tr key={member._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                          {member.name?.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{member.name}</strong>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          textTransform: 'uppercase',
                          background: member.role === 'superadmin' ? '#fef3c7' : member.role === 'admin' ? '#ccfbf1' : '#f1f5f9',
                          color: member.role === 'superadmin' ? '#92400e' : member.role === 'admin' ? '#0f766e' : '#475569',
                        }}
                      >
                        {member.role}
                      </span>
                    </td>
                    <td>{member.department?.name || 'All Hospital Desks'}</td>
                    <td>{member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'Active'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="btn btn--subtle"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                          onClick={() => setEditingStaff(member)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn--subtle"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', color: '#dc2626' }}
                          onClick={() => handleDeleteStaff(member)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: PATIENT REGISTRY */}
      {activeTab === 'patients' && (
        <div className="admin-table-container">
          <div className="admin-table-toolbar">
            <div className="admin-search-box">
              <Icon name="search" size={16} color="var(--ink-muted)" />
              <input
                type="text"
                placeholder="Search patients by name, ID, mobile..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn-action-primary-teal"
              onClick={() => setIsAddPatientOpen(true)}
            >
              <Icon name="plus" size={16} />
              <span>Register Patient</span>
            </button>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Name</th>
                <th>Demographics</th>
                <th>Phone Number</th>
                <th>Blood Group</th>
                <th>Location</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    No patient records in database. Register a patient to begin.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <span className="profile-id-badge">{p.patientId}</span>
                    </td>
                    <td>
                      <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>
                        {p.firstName} {p.lastName}
                      </strong>
                    </td>
                    <td>
                      {p.age}y • <span style={{ textTransform: 'capitalize' }}>{p.gender}</span>
                    </td>
                    <td><strong>{p.mobile}</strong></td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#dc2626' }}>{p.bloodGroup || '—'}</span>
                    </td>
                    <td>{p.address?.city || 'Jammu'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="btn btn--subtle"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                          onClick={() => setEditingPatient(p)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn--subtle"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', color: '#dc2626' }}
                          onClick={() => handleDeletePatient(p)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: SYSTEM & DATA HYGIENE */}
      {activeTab === 'system' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', color: '#0f172a' }}>
              Database Mock Data Purge
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 1.25rem' }}>
              Remove all sample/mock patient records, appointments, bills, and tickets. This leaves the core hospital configuration, department structure, and doctor accounts intact so the app operates in pure production mode.
            </p>
            <button
              type="button"
              className="btn btn--danger"
              disabled={purging}
              onClick={handlePurgeMockData}
            >
              <Icon name="close" size={16} />
              <span>{purging ? 'Purging in progress...' : 'Wipe All Mock Data Now'}</span>
            </button>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', color: '#0f172a' }}>
              Hospital Instance Details
            </h3>
            <dl className="summary-list" style={{ marginTop: '1rem' }}>
              <div className="summary-list__item">
                <dt>Hospital Code</dt>
                <dd>CDH (City District Hospital)</dd>
              </div>
              <div className="summary-list__item">
                <dt>Departments Configured</dt>
                <dd>{departments.length} Units (MED, CHD, WOM, ORT, ENT, EYE, SKN)</dd>
              </div>
              <div className="summary-list__item">
                <dt>Doctors Active</dt>
                <dd>{doctorList.length} Clinicians</dd>
              </div>
              <div className="summary-list__item">
                <dt>Staff Accounts</dt>
                <dd>{staffList.length} Personnel</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* ADD DOCTOR MODAL */}
      {isAddDoctorOpen && (
        <DoctorFormModal
          departments={departments}
          onClose={() => setIsAddDoctorOpen(false)}
          onSuccess={() => {
            setIsAddDoctorOpen(false)
            reloadDoctors(true)
          }}
        />
      )}

      {/* EDIT DOCTOR MODAL */}
      {editingDoctor && (
        <DoctorFormModal
          doctor={editingDoctor}
          departments={departments}
          onClose={() => setEditingDoctor(null)}
          onSuccess={() => {
            setEditingDoctor(null)
            reloadDoctors(true)
          }}
        />
      )}

      {/* ADD STAFF MODAL */}
      {isAddStaffOpen && (
        <StaffFormModal
          departments={departments}
          onClose={() => setIsAddStaffOpen(false)}
          onSuccess={() => {
            setIsAddStaffOpen(false)
            reloadStaff(true)
          }}
        />
      )}

      {/* EDIT STAFF MODAL */}
      {editingStaff && (
        <StaffFormModal
          staff={editingStaff}
          departments={departments}
          onClose={() => setEditingStaff(null)}
          onSuccess={() => {
            setEditingStaff(null)
            reloadStaff(true)
          }}
        />
      )}

      {/* ADD PATIENT MODAL */}
      {isAddPatientOpen && (
        <PatientFormModal
          onClose={() => setIsAddPatientOpen(false)}
          onSuccess={() => {
            setIsAddPatientOpen(false)
            reloadPatients(true)
          }}
        />
      )}

      {/* EDIT PATIENT MODAL */}
      {editingPatient && (
        <PatientFormModal
          patient={editingPatient}
          onClose={() => setEditingPatient(null)}
          onSuccess={() => {
            setEditingPatient(null)
            reloadPatients(true)
          }}
        />
      )}
    </AdminLayout>
  )
}

/** DOCTOR CREATE / EDIT MODAL */
function DoctorFormModal({ doctor, departments, onClose, onSuccess }) {
  const isEdit = Boolean(doctor)
  const [name, setName] = useState(doctor?.name || '')
  const [email, setEmail] = useState(doctor?.email || '')
  const [password, setPassword] = useState('')
  const [deptCode, setDeptCode] = useState(doctor?.department?.code || doctor?.departmentCode || 'MED')
  const [room, setRoom] = useState(doctor?.room || 'Room 1')
  const [specialty, setSpecialty] = useState(doctor?.specialty || 'General Medicine')
  const [consultationFee, setConsultationFee] = useState(doctor?.consultationFee ?? 20)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErr(null)
    try {
      const payload = {
        name,
        email,
        departmentCode: deptCode,
        room,
        specialty,
        consultationFee: Number(consultationFee),
      }
      if (password) payload.password = password

      if (isEdit) {
        await api.updateDoctor(doctor._id, payload)
      } else {
        payload.password = password || 'doctor123'
        await api.createDoctor(payload)
      }
      onSuccess()
    } catch (error) {
      setErr(error.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={isEdit ? `Edit Doctor: ${doctor.name}` : 'Add New Doctor'}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {err && <div style={{ color: '#dc2626', fontSize: '0.85rem' }}>{err}</div>}

        <div className="form-group">
          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Doctor Full Name *</label>
          <input
            type="text"
            required
            className="form-control"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dr. Rajesh Sharma"
          />
        </div>

        <div className="form-grid-2col">
          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Email Address *</label>
            <input
              type="email"
              required
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="doctor@hospital.org"
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {isEdit ? 'Password (leave blank to keep)' : 'Password *'}
            </label>
            <input
              type="password"
              required={!isEdit}
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? '••••••••' : 'Min 6 characters'}
            />
          </div>
        </div>

        <div className="form-grid-2col">
          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Department *</label>
            <select
              className="form-control"
              value={deptCode}
              onChange={(e) => setDeptCode(e.target.value)}
            >
              {departments.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Chamber Room *</label>
            <input
              type="text"
              required
              className="form-control"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g. Room 1, OPD Block A"
            />
          </div>
        </div>

        <div className="form-grid-2col">
          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Specialty</label>
            <input
              type="text"
              className="form-control"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="e.g. Internal Medicine"
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Standard Consultation Fee (₹)</label>
            <input
              type="number"
              min="0"
              className="form-control"
              value={consultationFee}
              onChange={(e) => setConsultationFee(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
          <button type="button" className="btn btn--outline" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Update Doctor' : 'Create Doctor'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/** STAFF CREATE / EDIT MODAL */
function StaffFormModal({ staff, departments, onClose, onSuccess }) {
  const isEdit = Boolean(staff)
  const [name, setName] = useState(staff?.name || '')
  const [email, setEmail] = useState(staff?.email || '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(staff?.role || 'staff')
  const [deptCode, setDeptCode] = useState(staff?.department?.code || '')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErr(null)
    try {
      const payload = {
        name,
        email,
        role,
        departmentCode: deptCode || undefined,
      }
      if (password) payload.password = password

      if (isEdit) {
        await api.updateStaff(staff._id, payload)
      } else {
        payload.password = password || 'staff123'
        await api.createStaff(payload)
      }
      onSuccess()
    } catch (error) {
      setErr(error.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={isEdit ? `Edit Personnel: ${staff.name}` : 'Add Staff Member'}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {err && <div style={{ color: '#dc2626', fontSize: '0.85rem' }}>{err}</div>}

        <div className="form-group">
          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Personnel Name *</label>
          <input
            type="text"
            required
            className="form-control"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sunita Devi"
          />
        </div>

        <div className="form-grid-2col">
          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Email Address *</label>
            <input
              type="email"
              required
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@hospital.org"
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {isEdit ? 'Password (leave blank to keep)' : 'Password *'}
            </label>
            <input
              type="password"
              required={!isEdit}
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? '••••••••' : 'Min 6 characters'}
            />
          </div>
        </div>

        <div className="form-grid-2col">
          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>System Role *</label>
            <select
              className="form-control"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="staff">Staff / Reception Kiosk</option>
              <option value="admin">Administrator</option>
              <option value="superadmin">Super Administrator</option>
            </select>
          </div>

          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Assigned Department (Optional)</label>
            <select
              className="form-control"
              value={deptCode}
              onChange={(e) => setDeptCode(e.target.value)}
            >
              <option value="">General Hospital / All Desks</option>
              {departments.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
          <button type="button" className="btn btn--outline" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Update Staff' : 'Create Staff'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/** PATIENT CREATE / EDIT MODAL */
function PatientFormModal({ patient, onClose, onSuccess }) {
  const isEdit = Boolean(patient)
  const [firstName, setFirstName] = useState(patient?.firstName || '')
  const [lastName, setLastName] = useState(patient?.lastName || '')
  const [gender, setGender] = useState(patient?.gender || 'male')
  const [age, setAge] = useState(patient?.age || '')
  const [mobile, setMobile] = useState(patient?.mobile || '')
  const [bloodGroup, setBloodGroup] = useState(patient?.bloodGroup || 'O+')
  const [city, setCity] = useState(patient?.address?.city || 'Jammu')
  const [emergencyName, setEmergencyName] = useState(patient?.emergencyContact?.name || '')
  const [emergencyPhone, setEmergencyPhone] = useState(patient?.emergencyContact?.phone || '')
  const [emergencyRelation, setEmergencyRelation] = useState(patient?.emergencyContact?.relation || 'Spouse')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErr(null)
    try {
      const payload = {
        firstName,
        lastName,
        gender,
        age: Number(age) || 30,
        mobile,
        bloodGroup,
        address: { city },
        emergencyContact: {
          name: emergencyName || 'Guardian',
          phone: emergencyPhone || mobile,
          relation: emergencyRelation,
        },
      }

      if (isEdit) {
        await api.updatePatient(patient.patientId, payload)
      } else {
        await api.registerPatient(payload)
      }
      onSuccess()
    } catch (error) {
      setErr(error.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={isEdit ? `Edit Patient: ${patient.patientId}` : 'Register New Patient'}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {err && <div style={{ color: '#dc2626', fontSize: '0.85rem' }}>{err}</div>}

        <div className="form-grid-2col">
          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>First Name *</label>
            <input
              type="text"
              required
              className="form-control"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. Ramesh"
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Last Name</label>
            <input
              type="text"
              className="form-control"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g. Kumar"
            />
          </div>
        </div>

        <div className="form-grid-3col">
          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Gender *</label>
            <select
              className="form-control"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Age *</label>
            <input
              type="number"
              min="0"
              max="125"
              required
              className="form-control"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 42"
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Blood Group</label>
            <select
              className="form-control"
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
            >
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>
        </div>

        <div className="form-grid-2col">
          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Mobile Number *</label>
            <input
              type="tel"
              required
              className="form-control"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="10-digit mobile"
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>City / District</label>
            <input
              type="text"
              className="form-control"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Jammu"
            />
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <strong style={{ fontSize: '0.82rem', color: '#475569', display: 'block', marginBottom: '0.4rem' }}>
            Emergency Contact Information
          </strong>
          <div className="form-grid-3col">
            <input
              type="text"
              className="form-control"
              placeholder="Contact Name"
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
            />
            <input
              type="text"
              className="form-control"
              placeholder="Relation (e.g. Spouse)"
              value={emergencyRelation}
              onChange={(e) => setEmergencyRelation(e.target.value)}
            />
            <input
              type="tel"
              className="form-control"
              placeholder="Emergency Phone"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
          <button type="button" className="btn btn--outline" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Update Patient' : 'Register Patient'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
