import { useState } from 'react'
import AdminLayout from './AdminLayout.jsx'
import { api } from '../../api/client.js'
import { useAsync } from '../../hooks/useAsync.js'
import { Loading, ErrorNote } from '../../components/common/Status.jsx'
import { Icon } from '../../components/common/Icons.jsx'
import Modal from '../../components/common/Modal.jsx'

export default function FollowUpManager() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)

  // Fetch appointments
  const { data: allAppointments, loading, error, reload } = useAsync(
    () => api.appointments({}),
    []
  )

  // Filter for follow-up appointments or appointments with followUpDate
  const aptList = Array.isArray(allAppointments) ? allAppointments : allAppointments?.appointments || []
  const followUps = aptList.filter((apt) => {
    const isFollowUp = apt.type === 'follow_up' || Boolean(apt.followUpDate)
    if (!isFollowUp) return false

    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      const match =
        apt.patientName?.toLowerCase().includes(q) ||
        apt.patientId?.toLowerCase().includes(q) ||
        apt.complaint?.toLowerCase().includes(q) ||
        apt.diagnosis?.toLowerCase().includes(q)
      if (!match) return false
    }

    if (statusFilter !== 'All') {
      if (statusFilter === 'Completed' && apt.status !== 'completed') return false
      if (statusFilter === 'Upcoming' && (apt.status === 'completed' || apt.status === 'cancelled')) return false
    }

    return true
  })

  // Mark follow-up completed
  const handleMarkComplete = async (aptId) => {
    setUpdatingId(aptId)
    try {
      await api.updateAppointment(aptId, { status: 'completed' })
      await reload(true)
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  const today = new Date()
  const dueSoon = followUps.filter((f) => {
    const dStr = f.followUpDate || f.appointmentDate
    if (!dStr) return false
    const fDate = new Date(dStr)
    const diffDays = Math.ceil((fDate - today) / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= 7 && f.status !== 'completed'
  })

  return (
    <AdminLayout>
      {/* 1. Page Header (Screenshot 2) */}
      <div className="mediflow-page-header">
        <div>
          <h1 className="mediflow-page-title">Follow-ups</h1>
          <p className="mediflow-page-subtitle">
            Keep track of patients who need another visit.
          </p>
        </div>

        <button
          type="button"
          className="btn-action-primary-teal"
          onClick={() => setIsScheduleOpen(true)}
        >
          <Icon name="plus" size={16} />
          <span>Schedule Follow-up</span>
        </button>
      </div>

      {/* 2. Yellow Reminder Alert Banner (Screenshot 2) */}
      {dueSoon.length > 0 ? (
        <div className="followup-reminder-banner" role="alert">
          <div className="followup-reminder-title">
            <Icon name="clock" size={16} color="#854d0e" />
            <span>Reminders: {dueSoon.length} follow-up{dueSoon.length !== 1 ? 's' : ''} due this week</span>
          </div>
          <div className="followup-reminder-sub">
            {dueSoon[0]?.patientName} ({dueSoon[0]?.followUpDate || dueSoon[0]?.appointmentDate})
          </div>
        </div>
      ) : (
        <div className="followup-reminder-banner" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }} role="status">
          <div className="followup-reminder-title" style={{ color: '#166534' }}>
            <Icon name="check-circle" size={16} color="#166534" />
            <span>All scheduled patient follow-up reviews are up to date</span>
          </div>
        </div>
      )}

      {/* 3. Filter Toolbar (Screenshot 2) */}
      <div className="followup-filter-box">
        <div className="followup-field-group">
          <label>Search</label>
          <input
            type="text"
            className="form-control"
            placeholder="Patient name, ID or reason"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="followup-field-group" style={{ maxWidth: 180 }}>
          <label>Status</label>
          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn-action-primary-teal"
            style={{ padding: '0.55rem 1.15rem' }}
          >
            <span>Filter</span>
          </button>
          <button
            type="button"
            className="btn btn--subtle"
            style={{ padding: '0.55rem 1rem' }}
            onClick={() => {
              setSearchTerm('')
              setStatusFilter('All')
            }}
          >
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* 4. Follow-up Cards List (Screenshot 2) */}
      {loading ? (
        <div style={{ padding: '3rem 0' }}>
          <Loading message="Loading follow-up consultations..." />
        </div>
      ) : error ? (
        <div style={{ padding: '1rem 0' }}>
          <ErrorNote error={error} onRetry={reload} />
        </div>
      ) : followUps.length === 0 ? (
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
          No follow-ups found matching your filters. Click "Schedule Follow-up" to book one.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {followUps.map((apt) => {
            const dateStr = apt.followUpDate || apt.appointmentDate || '2026-10-31'
            const parts = dateStr.split('-')
            const dayNum = parts[2] || '31'
            const monthYear = `${parts[1] || '10'}/${parts[0]?.slice(2) || '26'}`
            const isCompleted = apt.status === 'completed'

            return (
              <div key={apt._id} className="followup-card-item">
                <div className="followup-card-left">
                  {/* Left Date Badge */}
                  <div className="followup-date-badge">
                    <span className="followup-date-day">{dayNum}</span>
                    <span className="followup-date-my">{monthYear}</span>
                  </div>

                  {/* Patient Details */}
                  <div className="followup-card-details">
                    <div>
                      <span className="followup-patient-title">{apt.patientName}</span>
                      <span className="followup-patient-id">{apt.patientId}</span>
                    </div>
                    <div className="followup-doctor-line">
                      {apt.doctorName || 'Dr. Meena Iyer'} - previous visit {apt.appointmentDate}
                    </div>
                    <div className="followup-reason-line">
                      {apt.complaint || apt.diagnosis || 'Review after treatment'}
                    </div>
                  </div>
                </div>

                <div className="followup-card-right">
                  <div className="followup-status-block">
                    {isCompleted ? (
                      <span className="badge-completed">Completed</span>
                    ) : (
                      <>
                        <span className="badge-upcoming-pill">Upcoming</span>
                        <span className="followup-due-subtext">Due soon</span>
                      </>
                    )}
                  </div>

                  {!isCompleted && (
                    <button
                      type="button"
                      disabled={updatingId === apt._id}
                      className="btn-complete-teal"
                      onClick={() => handleMarkComplete(apt._id)}
                    >
                      <Icon name="check" size={14} />
                      <span>{updatingId === apt._id ? 'Updating...' : 'Complete'}</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Schedule Follow-up Modal */}
      {isScheduleOpen && (
        <ScheduleFollowUpModal
          onClose={() => setIsScheduleOpen(false)}
          onSuccess={() => {
            setIsScheduleOpen(false)
            reload(true)
          }}
        />
      )}
    </AdminLayout>
  )
}

/** Schedule Follow-up Modal */
function ScheduleFollowUpModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    patientId: 'CDH-P-1001',
    appointmentDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    slotTime: '10:00 AM',
    complaint: 'Review after treatment & symptom check',
    departmentCode: 'MED',
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.bookAppointment({
        ...formData,
        type: 'follow_up',
      })
      onSuccess()
    } catch (err) {
      alert('Failed: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <h3 className="modal__title" style={{ margin: 0 }}>Schedule Patient Follow-up</h3>
          <p className="modal__lead" style={{ margin: '0.2rem 0 0' }}>
            Sets follow-up date and schedules automated SMS reminder.
          </p>
        </div>

        <div className="form-group">
          <label>Hospital Patient ID *</label>
          <input
            type="text"
            required
            className="form-control"
            value={formData.patientId}
            onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
            placeholder="e.g. CDH-P-1001"
          />
        </div>

        <div className="form-grid-2col">
          <div className="form-group">
            <label>Follow-up Date *</label>
            <input
              type="date"
              required
              className="form-control"
              value={formData.appointmentDate}
              onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Time Slot</label>
            <select
              className="form-control"
              value={formData.slotTime}
              onChange={(e) => setFormData({ ...formData, slotTime: e.target.value })}
            >
              <option value="09:00 AM">09:00 AM</option>
              <option value="10:00 AM">10:00 AM</option>
              <option value="11:00 AM">11:00 AM</option>
              <option value="02:00 PM">02:00 PM</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Reason for Follow-up *</label>
          <input
            type="text"
            required
            className="form-control"
            value={formData.complaint}
            onChange={(e) => setFormData({ ...formData, complaint: e.target.value })}
            placeholder="e.g. Blood pressure recheck, Wound dressing"
          />
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
            {submitting ? 'Scheduling...' : 'Confirm Follow-up'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
