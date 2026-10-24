import { useState, useEffect } from 'react'
import AdminLayout from './AdminLayout.jsx'
import { api } from '../../api/client.js'
import { useAsync } from '../../hooks/useAsync.js'
import { Loading, ErrorNote } from '../../components/common/Status.jsx'
import { Icon } from '../../components/common/Icons.jsx'
import Modal from '../../components/common/Modal.jsx'
import { useLocation, navigate } from '../../router.jsx'
import ReceiptModal from './ReceiptModal.jsx'

export default function DoctorAppointmentManager() {
  const { search } = useLocation()
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedDept, setSelectedDept] = useState('')
  const [isBookOpen, setIsBookOpen] = useState(false)
  const [consultationModalApt, setConsultationModalApt] = useState(null)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [doctorUpdating, setDoctorUpdating] = useState(false)

  // Fetch doctors
  const { data: doctors, reload: reloadDoctors } = useAsync(() => api.adminDoctors(), [])

  // Fetch appointments with filters
  const {
    data: appointmentsList,
    loading,
    error,
    reload: reloadAppointments,
  } = useAsync(
    () =>
      api.appointments({
        status: selectedStatus || undefined,
        departmentCode: selectedDept || undefined,
      }),
    [selectedStatus, selectedDept]
  )

  // Handle URL query parameters (e.g. ?book=1&patientId=CDH-P-1001)
  const [presetPatient, setPresetPatient] = useState(null)
  useEffect(() => {
    const params = new URLSearchParams(search)
    if (params.get('book') === '1') {
      setIsBookOpen(true)
      if (params.get('patientId')) {
        setPresetPatient({
          patientId: params.get('patientId'),
          name: params.get('name') || '',
          mobile: params.get('mobile') || '',
        })
      }
    }
  }, [search])

  const handleToggleDoctorStatus = async (doctorId, nextStatus) => {
    setDoctorUpdating(true)
    try {
      await api.updateDoctorStatus(doctorId, nextStatus)
      await reloadDoctors(true)
    } catch (err) {
      alert('Error changing status: ' + err.message)
    } finally {
      setDoctorUpdating(false)
    }
  }

  const handleUpdateStatus = async (aptId, status) => {
    try {
      await api.updateAppointment(aptId, { status })
      await reloadAppointments(true)
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  return (
    <AdminLayout>
      <div className="admin-section-header">
        <div>
          <h2>
            <Icon name="calendar" size={22} color="var(--primary)" />
            <span>Doctors & OPD Appointment Scheduling</span>
          </h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
            Manage doctor chambers, OPD bookings, and follow-up clinical visits
          </div>
        </div>

        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            setPresetPatient(null)
            setIsBookOpen(true)
          }}
        >
          <Icon name="plus" size={16} />
          <span>Book New Appointment</span>
        </button>
      </div>

      {/* Doctor Directory Strip */}
      <section style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', margin: '0 0 0.75rem', color: 'var(--ink)' }}>
          Active Doctor Chambers & Specialties
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {doctors?.map((doc) => {
            const isOnDuty = doc.status === 'on_duty' || doc.status === 'in_consultation'
            return (
              <div
                key={doc._id}
                style={{
                  background: 'var(--surface)',
                  border: 'var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '1rem',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ fontSize: '1rem', color: 'var(--ink)' }}>{doc.name}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                      {doc.specialty || 'General Medicine'}
                    </div>
                  </div>
                  <span className={`status-pill status-pill--${doc.status}`}>
                    {doc.status?.replace('_', ' ')}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
                  <span>Chamber: <strong>{doc.room || 'OPD-1'}</strong></span>
                  <span>OPD Fee: <strong>₹{doc.consultationFee ?? 20}</strong></span>
                </div>

                <div style={{ marginTop: '0.25rem', display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    disabled={doctorUpdating}
                    className="btn-action-sm"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() =>
                      handleToggleDoctorStatus(doc._id, isOnDuty ? 'off_duty' : 'on_duty')
                    }
                  >
                    {isOnDuty ? 'Set Off-Duty' : 'Put On-Duty'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Appointments Management Table */}
      <div className="admin-table-container">
        <div className="admin-table-toolbar">
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <strong style={{ fontSize: '0.95rem', color: 'var(--ink)' }}>Appointments List</strong>

            {/* Filter by status */}
            <select
              className="form-control"
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="checked_in">Checked In</option>
              <option value="in_consultation">In Consultation</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Filter by department */}
            <select
              className="form-control"
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              <option value="">All Departments</option>
              <option value="medicine">Medicine</option>
              <option value="pediatrics">Pediatrics</option>
              <option value="orthopedics">Orthopedics</option>
              <option value="ent">ENT</option>
              <option value="gynecology">Gynecology</option>
              <option value="dermatology">Dermatology</option>
              <option value="ophthalmology">Ophthalmology</option>
            </select>
          </div>

          <button
            type="button"
            className="btn-action-sm"
            onClick={() => reloadAppointments(true)}
          >
            <Icon name="refresh" size={14} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '3rem' }}>
            <Loading message="Loading appointments schedule..." />
          </div>
        ) : error ? (
          <div style={{ padding: '2rem' }}>
            <ErrorNote error={error} onRetry={reloadAppointments} />
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Appointment ID</th>
                <th>Date & Time</th>
                <th>Patient Name & ID</th>
                <th>Department</th>
                <th>Doctor</th>
                <th>Visit Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointmentsList?.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--ink-muted)' }}>
                    No appointments found matching your filters.
                  </td>
                </tr>
              ) : (
                appointmentsList?.map((apt) => (
                  <tr key={apt._id}>
                    <td>
                      <span className="profile-id-badge">{apt.appointmentId}</span>
                    </td>
                    <td>
                      <strong>{apt.appointmentDate}</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
                        {apt.slotTime || '09:00 AM'}
                      </div>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--ink)' }}>{apt.patientName}</strong>
                      <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--primary)' }}>
                        {apt.patientId}
                      </div>
                    </td>
                    <td>
                      <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>
                        {apt.departmentCode}
                      </span>
                    </td>
                    <td>{apt.doctorName || 'Duty Doctor'}</td>
                    <td>
                      <span
                        style={{
                          textTransform: 'capitalize',
                          fontSize: '0.78rem',
                          background: apt.type === 'follow_up' ? '#f0fdf4' : 'var(--surface-subtle)',
                          color: apt.type === 'follow_up' ? '#166534' : 'inherit',
                          padding: '0.2rem 0.5rem',
                          borderRadius: 'var(--radius-xs)',
                          fontWeight: apt.type === 'follow_up' ? 700 : 500,
                        }}
                      >
                        {apt.type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill status-pill--${apt.status}`}>
                        {apt.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {apt.status === 'scheduled' && (
                          <button
                            type="button"
                            className="btn-action-sm btn-action-primary"
                            onClick={() => handleUpdateStatus(apt._id, 'checked_in')}
                            title="Mark patient checked in at counter"
                          >
                            <span>Check-In</span>
                          </button>
                        )}

                        {apt.status === 'checked_in' && (
                          <button
                            type="button"
                            className="btn-action-sm btn-action-primary"
                            onClick={() => handleUpdateStatus(apt._id, 'in_consultation')}
                            title="Call into Doctor's examination room"
                          >
                            <span>Call In</span>
                          </button>
                        )}

                        {apt.status === 'in_consultation' && (
                          <button
                            type="button"
                            className="btn-action-sm"
                            style={{ background: 'var(--ok-bg)', color: 'var(--ok)', borderColor: 'var(--ok-border)' }}
                            onClick={() => setConsultationModalApt(apt)}
                            title="Record consultation notes & follow-up"
                          >
                            <Icon name="check" size={13} />
                            <span>Complete</span>
                          </button>
                        )}

                        {apt.status === 'completed' && (
                          <button
                            type="button"
                            className="btn-action-sm"
                            onClick={() => setConsultationModalApt(apt)}
                            title="View diagnosis & prescriptions"
                          >
                            <Icon name="clipboard" size={13} />
                            <span>Notes</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn-action-sm"
                          onClick={() => navigate(`/admin/patients?profile=${apt.patientId}`)}
                          title="View patient history"
                        >
                          <Icon name="user" size={13} />
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

      {/* Appointment Booking Modal */}
      {isBookOpen && (
        <BookingModal
          presetPatient={presetPatient}
          doctors={doctors}
          onClose={() => setIsBookOpen(false)}
          onSuccess={(res) => {
            setIsBookOpen(false)
            reloadAppointments(true)
            if (res.bill) {
              setSelectedReceipt(res.bill)
            }
          }}
        />
      )}

      {/* Consultation Completion & Follow-up Modal */}
      {consultationModalApt && (
        <ConsultationCompletionModal
          appointment={consultationModalApt}
          onClose={() => setConsultationModalApt(null)}
          onSuccess={() => {
            setConsultationModalApt(null)
            reloadAppointments(true)
          }}
        />
      )}

      {/* Receipt View if generated */}
      {selectedReceipt && (
        <ReceiptModal bill={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
      )}
    </AdminLayout>
  )
}

/** Appointment Booking Form Modal */
function BookingModal({ presetPatient, doctors, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    patientId: presetPatient?.patientId || '',
    patientName: presetPatient?.name || '',
    patientMobile: presetPatient?.mobile || '',
    departmentCode: 'medicine',
    doctorId: '',
    appointmentDate: new Date().toISOString().split('T')[0],
    slotTime: '10:00 AM',
    type: presetPatient ? 'follow_up' : 'walk_in',
    symptoms: '',
    autoQueueToday: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  const handlePatientLookup = async (id) => {
    if (!id || id.length < 5) return
    try {
      const res = await api.patientProfile(id)
      if (res?.patient) {
        setFormData((prev) => ({
          ...prev,
          patientName: `${res.patient.firstName} ${res.patient.lastName}`,
          patientMobile: res.patient.mobile,
        }))
      }
    } catch {
      // ignore
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg(null)
    try {
      const selectedDoc = (doctors || []).find((d) => d._id === formData.doctorId)
      const res = await api.bookAppointment({
        ...formData,
        doctorName: selectedDoc?.name || undefined,
      })
      onSuccess(res)
    } catch (err) {
      setErrorMsg(err.message || 'Booking failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <h3 className="modal__title" style={{ margin: 0 }}>Schedule OPD Appointment</h3>
          <p className="modal__lead" style={{ margin: '0.2rem 0 0' }}>
            Books doctor consultation, issues live token, and generates OPD fee bill.
          </p>
        </div>

        {errorMsg && <div className="note note--danger">{errorMsg}</div>}

        <div className="form-grid-2col">
          <div className="form-group">
            <label>Patient ID (Hospital ID) *</label>
            <input
              type="text"
              required
              placeholder="e.g. CDH-P-1001"
              className="form-control"
              value={formData.patientId}
              onChange={(e) => {
                setFormData({ ...formData, patientId: e.target.value })
                handlePatientLookup(e.target.value)
              }}
            />
          </div>

          <div className="form-group">
            <label>Patient Full Name *</label>
            <input
              type="text"
              required
              placeholder="Full name"
              className="form-control"
              value={formData.patientName}
              onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
            />
          </div>
        </div>

        <div className="form-grid-2col">
          <div className="form-group">
            <label>Mobile Number *</label>
            <input
              type="tel"
              required
              placeholder="10-digit mobile"
              className="form-control"
              value={formData.patientMobile}
              onChange={(e) => setFormData({ ...formData, patientMobile: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Visit Type</label>
            <select
              className="form-control"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="walk_in">Walk-in OPD Visit</option>
              <option value="scheduled">Scheduled Advance Booking</option>
              <option value="follow_up">Doctor Prescribed Follow-up</option>
            </select>
          </div>
        </div>

        <div className="form-grid-2col">
          <div className="form-group">
            <label>Department *</label>
            <select
              className="form-control"
              value={formData.departmentCode}
              onChange={(e) => setFormData({ ...formData, departmentCode: e.target.value })}
            >
              <option value="medicine">General Medicine</option>
              <option value="pediatrics">Pediatrics</option>
              <option value="orthopedics">Orthopedics</option>
              <option value="ent">ENT</option>
              <option value="gynecology">Gynecology</option>
              <option value="dermatology">Dermatology</option>
              <option value="ophthalmology">Ophthalmology</option>
            </select>
          </div>

          <div className="form-group">
            <label>Doctor Assigned</label>
            <select
              className="form-control"
              value={formData.doctorId}
              onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
            >
              <option value="">Any Available Duty Doctor</option>
              {(doctors || []).map((doc) => (
                <option key={doc._id} value={doc._id}>
                  {doc.name} ({doc.specialty || 'General'})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-grid-2col">
          <div className="form-group">
            <label>Appointment Date *</label>
            <input
              type="date"
              required
              className="form-control"
              value={formData.appointmentDate}
              onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Time Slot *</label>
            <select
              className="form-control"
              value={formData.slotTime}
              onChange={(e) => setFormData({ ...formData, slotTime: e.target.value })}
            >
              <option value="09:00 AM">09:00 AM</option>
              <option value="09:30 AM">09:30 AM</option>
              <option value="10:00 AM">10:00 AM</option>
              <option value="10:30 AM">10:30 AM</option>
              <option value="11:00 AM">11:00 AM</option>
              <option value="11:30 AM">11:30 AM</option>
              <option value="02:00 PM">02:00 PM</option>
              <option value="03:00 PM">03:00 PM</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Symptoms / Chief Complaints</label>
          <input
            type="text"
            placeholder="e.g. Chronic cough, fever for 3 days"
            className="form-control"
            value={formData.symptoms}
            onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f0f9ff', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)' }}>
          <input
            type="checkbox"
            id="chkAutoQueue"
            checked={formData.autoQueueToday}
            onChange={(e) => setFormData({ ...formData, autoQueueToday: e.target.checked })}
          />
          <label htmlFor="chkAutoQueue" style={{ fontSize: '0.85rem', color: 'var(--primary-hover)', fontWeight: 600, cursor: 'pointer' }}>
            Auto-generate live OPD token and enqueue into department queue now
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button type="button" className="btn btn--subtle" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Booking Visit...' : 'Confirm Appointment'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/** Consultation Notes & Follow-up Booking Modal */
function ConsultationCompletionModal({ appointment, onClose, onSuccess }) {
  const isViewOnly = appointment.status === 'completed'
  const [formData, setFormData] = useState({
    diagnosis: appointment.diagnosis || '',
    consultationNotes: appointment.consultationNotes || '',
    prescriptions: appointment.prescriptions || '',
    followUpDate: appointment.followUpDate || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.completeConsultation(appointment._id, formData)
      onSuccess()
    } catch (err) {
      alert('Failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose}>
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <h3 className="modal__title" style={{ margin: 0 }}>
            {isViewOnly ? 'Consultation Record' : 'Record Consultation Notes & Follow-up'}
          </h3>
          <p className="modal__lead" style={{ margin: '0.2rem 0 0' }}>
            Patient: <strong>{appointment.patientName}</strong> ({appointment.patientId}) • {appointment.departmentCode}
          </p>
        </div>

        <div className="form-group">
          <label>Clinical Diagnosis *</label>
          <input
            type="text"
            required
            disabled={isViewOnly}
            placeholder="e.g. Acute Bronchitis, Mild Hypertension"
            className="form-control"
            value={formData.diagnosis}
            onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Consultation & Clinical Notes</label>
          <textarea
            rows={3}
            disabled={isViewOnly}
            placeholder="Doctor's findings, observations, diet recommendations..."
            className="form-control"
            value={formData.consultationNotes}
            onChange={(e) => setFormData({ ...formData, consultationNotes: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Prescribed Medicines & Dosages</label>
          <textarea
            rows={2}
            disabled={isViewOnly}
            placeholder="e.g. Paracetamol 500mg TDS, Azithromycin 500mg OD x 3 days"
            className="form-control"
            value={formData.prescriptions}
            onChange={(e) => setFormData({ ...formData, prescriptions: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Follow-up Visit Date (Auto-books appointment with SMS alert)</label>
          <input
            type="date"
            disabled={isViewOnly}
            className="form-control"
            value={formData.followUpDate}
            onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
          />
          {formData.followUpDate && (
            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.2rem' }}>
              ✓ Automated reminder will be scheduled for this follow-up date.
            </span>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button type="button" className="btn btn--subtle" onClick={onClose}>
            {isViewOnly ? 'Close' : 'Cancel'}
          </button>
          {!isViewOnly && (
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Saving...' : 'Complete & Record Visit'}
            </button>
          )}
        </div>
      </form>
    </Modal>
  )
}
