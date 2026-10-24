import { useState } from 'react'
import AdminLayout from './AdminLayout.jsx'
import { api } from '../../api/client.js'
import { useAsync } from '../../hooks/useAsync.js'
import { useSocket } from '../../api/socket.js'
import { Loading, ErrorNote } from '../../components/common/Status.jsx'
import { Icon } from '../../components/common/Icons.jsx'
import { Link, navigate } from '../../router.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import Modal from '../../components/common/Modal.jsx'
import ReceiptModal from './ReceiptModal.jsx'

export default function AdminDashboard() {
  const { currentUser } = useAuth()
  const { data, loading, error, reload } = useAsync(() => api.adminOverview(), [])
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false)
  const [isBookAptOpen, setIsBookAptOpen] = useState(false)
  const [callingNext, setCallingNext] = useState(false)

  // Real-time live updates via WebSockets
  useSocket({
    on: {
      'queue:updated': () => reload(true),
      'ticket:created': () => reload(true),
      'ticket:called': () => reload(true),
      'ticket:completed': () => reload(true),
    },
  })

  const firstName = currentUser?.name?.split(' ')[0] || 'Asha'

  const handleCallNextPatient = async () => {
    setCallingNext(true)
    try {
      const res = await api.callNext()
      alert(`Calling Next Patient: Token ${res.ticket?.tokenNumber || 'Next'} (${res.ticket?.patient?.firstName || 'Patient'})`)
      await reload(true)
    } catch (err) {
      alert(err.message === 'No patients waiting' ? 'No patients currently waiting in queue.' : `Call Next: ${err.message}`)
    } finally {
      setCallingNext(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <Loading message="Loading MediFlow Dashboard..." />
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <ErrorNote error={error} onRetry={reload} />
      </AdminLayout>
    )
  }

  const { metrics, liveQueueTracker, dailySchedule, doctors, financialSummary } = data || {}

  // Real live metrics from active database
  const totalPatientsToday = metrics?.totalRegisteredPatients ?? 0
  const appointmentsToday = metrics?.activeAppointmentsToday ?? 0
  const patientsWaiting = metrics?.currentlyWaitingQueue ?? 0
  const completedConsultations = metrics?.completedConsultationsToday ?? 0
  const doctorsAvailable = metrics?.availableDoctorsCount ?? 0
  const pendingInvoicesCount = financialSummary?.pendingBillsCount ?? 0
  const pendingDueAmount = financialSummary?.pendingAmount ?? 0

  return (
    <AdminLayout>
      {/* 1. Header Hero Greeting & Quick Action Buttons */}
      <section className="mediflow-hero">
        <div className="mediflow-hero__text">
          <h1>Hello, {firstName}</h1>
          <p>Here is how MediFlow Demo Clinic looks today.</p>
        </div>

        <div className="mediflow-hero__actions">
          <button
            type="button"
            className="btn-action-primary-teal"
            onClick={() => setIsAddPatientOpen(true)}
          >
            <Icon name="plus" size={16} />
            <span>Add Patient</span>
          </button>

          <button
            type="button"
            className="btn-action-outline"
            onClick={() => setIsBookAptOpen(true)}
          >
            <Icon name="calendar" size={16} />
            <span>Book Appointment</span>
          </button>

          <button
            type="button"
            className="btn-action-outline"
            disabled={callingNext}
            onClick={handleCallNextPatient}
          >
            <Icon name="speaker" size={16} />
            <span>{callingNext ? 'Calling...' : 'Call Next Patient'}</span>
          </button>

          <button
            type="button"
            className="btn-action-outline"
            onClick={() => navigate('/admin/billing')}
          >
            <Icon name="currency-inr" size={16} />
            <span>Create Bill</span>
          </button>
        </div>
      </section>

      {/* 2. 6 Pastel Metric Cards Grid */}
      <section className="mediflow-metrics-grid">
        {/* Card 1: Blue - Total patients today */}
        <div className="pastel-metric-card pastel-card--blue">
          <div className="pastel-card__icon">
            <Icon name="users" size={18} />
          </div>
          <div className="pastel-card__value">{totalPatientsToday}</div>
          <div className="pastel-card__label">Total patients today</div>
        </div>

        {/* Card 2: Green - Appointments today */}
        <div className="pastel-metric-card pastel-card--green">
          <div className="pastel-card__icon">
            <Icon name="calendar" size={18} />
          </div>
          <div className="pastel-card__value">{appointmentsToday}</div>
          <div className="pastel-card__label">Appointments today</div>
        </div>

        {/* Card 3: Yellow/Amber - Patients waiting */}
        <div className="pastel-metric-card pastel-card--amber">
          <div className="pastel-card__icon">
            <Icon name="clock" size={18} />
          </div>
          <div className="pastel-card__value">{patientsWaiting}</div>
          <div className="pastel-card__label">Patients waiting</div>
        </div>

        {/* Card 4: Purple - Completed consultations */}
        <div className="pastel-metric-card pastel-card--purple">
          <div className="pastel-card__icon">
            <Icon name="check-circle" size={18} />
          </div>
          <div className="pastel-card__value">{completedConsultations}</div>
          <div className="pastel-card__label">Completed consultations</div>
        </div>

        {/* Card 5: Teal - Doctors available */}
        <div className="pastel-metric-card pastel-card--teal">
          <div className="pastel-card__icon">
            <Icon name="doctor" size={18} />
          </div>
          <div className="pastel-card__value">{doctorsAvailable}</div>
          <div className="pastel-card__label">Doctors available</div>
        </div>

        {/* Card 6: Pink - Pending payments */}
        <div className="pastel-metric-card pastel-card--pink">
          <div className="pastel-card__icon">
            <Icon name="currency-inr" size={18} />
          </div>
          <div className="pastel-card__value">{pendingInvoicesCount}</div>
          <div className="pastel-card__label">Pending payments</div>
          <div className="pastel-card__sub">₹{pendingDueAmount} due</div>
        </div>
      </section>

      {/* 3. Two-Column Lower Section: Today's schedule & Live OPD queue */}
      <section className="mediflow-columns-grid">
        {/* Left Column: Today's schedule */}
        <div className="mediflow-white-box">
          <div className="mediflow-box-header">
            <h2>Today's schedule</h2>
            <Link to="/admin/appointments" className="mediflow-link-sm">
              View all
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {dailySchedule && dailySchedule.length > 0 ? (
              dailySchedule.slice(0, 6).map((apt) => {
                const isCompleted = apt.status === 'completed'
                const isInProgress = apt.status === 'in_consultation' || apt.status === 'in_queue'
                return (
                  <div key={apt._id} className="schedule-item-row">
                    <span className="schedule-time-badge">{apt.slotTime || '09:00'}</span>
                    <div className="schedule-patient-meta">
                      <div>
                        <span className="schedule-patient-name">{apt.patientName}</span>
                        <span className="schedule-patient-id">{apt.patientId}</span>
                      </div>
                      <div className="schedule-doctor-sub">
                        {apt.doctorName || 'Dr. Anita Sharma'} - {apt.complaint || 'Routine checkup'}
                      </div>
                    </div>
                    <div>
                      {isCompleted ? (
                        <span className="badge-completed">Completed</span>
                      ) : isInProgress ? (
                        <span className="badge-inprogress">In Progress</span>
                      ) : (
                        <span className="badge-scheduled">Scheduled</span>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                No appointments scheduled for today.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live OPD queue */}
        <div className="mediflow-white-box">
          <div className="mediflow-box-header">
            <h2>Live OPD queue</h2>
            <Link to="/board" className="mediflow-link-sm" target="_blank">
              Open queue
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {liveQueueTracker && liveQueueTracker.length > 0 ? (
              liveQueueTracker.slice(0, 6).map((dept, idx) => {
                const tokenCode = dept.nowServingToken !== 'None' ? dept.nowServingToken : '—'
                const isCoral = idx % 2 === 1
                return (
                  <div key={dept.code} className="queue-item-row">
                    <span className={isCoral ? 'token-badge-coral' : 'token-badge-blue'}>
                      {tokenCode}
                    </span>
                    <div className="queue-patient-meta">
                      <div className="queue-patient-name">
                        {dept.nowServingPatient !== '—' ? dept.nowServingPatient : dept.name}
                      </div>
                      <div className="queue-doctor-sub">
                        {dept.doctorName}
                        {dept.totalWaiting > 0 ? (
                          <span className="wait-time-tag"> • waiting {dept.estimatedWaitMinutes || 15} min</span>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}> • Queue clear</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                All OPD queues clear.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Quick Add Patient Modal */}
      {isAddPatientOpen && (
        <QuickAddPatientModal
          onClose={() => setIsAddPatientOpen(false)}
          onSuccess={() => {
            setIsAddPatientOpen(false)
            reload(true)
          }}
        />
      )}

      {/* Quick Book Appointment Modal */}
      {isBookAptOpen && (
        <QuickBookAppointmentModal
          doctors={doctors}
          onClose={() => setIsBookAptOpen(false)}
          onSuccess={(res) => {
            setIsBookAptOpen(false)
            reload(true)
            if (res.bill) setSelectedReceipt(res.bill)
          }}
        />
      )}

      {/* Receipt Modal if generated */}
      {selectedReceipt && (
        <ReceiptModal bill={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
      )}
    </AdminLayout>
  )
}

/** Quick Patient Registration Modal */
function QuickAddPatientModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: 'female',
    age: '28',
    mobile: '',
    bloodGroup: 'B+',
    city: 'Central District',
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
      await api.registerPatient(payload)
      onSuccess()
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
          <h3 className="modal__title" style={{ margin: 0 }}>Add New Patient</h3>
          <p className="modal__lead" style={{ margin: '0.2rem 0 0' }}>
            Creates digital OPD record with auto-assigned CDH-P-XXXX Hospital ID.
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
              placeholder="e.g. Ananya"
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
              placeholder="e.g. Reddy"
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
            <label>Age *</label>
            <input
              type="number"
              required
              className="form-control"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
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
              placeholder="9876543299"
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
            className="btn btn--primary"
            disabled={submitting}
            style={{ background: '#0d9488', borderColor: '#0d9488' }}
          >
            {submitting ? 'Registering...' : 'Register Patient'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/** Quick Book Appointment Modal */
function QuickBookAppointmentModal({ doctors, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    patientId: 'CDH-P-1001',
    departmentCode: 'MED',
    slotTime: '11:00 AM',
    complaint: 'Follow-up consultation',
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await api.bookAppointment({
        ...formData,
        appointmentDate: new Date().toISOString().split('T')[0],
        type: 'walk_in',
      })
      onSuccess(res)
    } catch (err) {
      alert('Booking failed: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <h3 className="modal__title" style={{ margin: 0 }}>Book OPD Appointment</h3>
          <p className="modal__lead" style={{ margin: '0.2rem 0 0' }}>
            Issues live consultation token and assigns doctor chamber.
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
            <label>Department</label>
            <select
              className="form-control"
              value={formData.departmentCode}
              onChange={(e) => setFormData({ ...formData, departmentCode: e.target.value })}
            >
              <option value="MED">General Medicine (Room 1)</option>
              <option value="CHD">Pediatrics (Room 3)</option>
              <option value="WOM">Gynecology (Room 4)</option>
              <option value="ORT">Orthopedics (Room 5)</option>
              <option value="ENT">ENT (Room 6)</option>
              <option value="EYE">Ophthalmology (Room 7)</option>
              <option value="SKN">Dermatology (Room 8)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Time Slot</label>
            <select
              className="form-control"
              value={formData.slotTime}
              onChange={(e) => setFormData({ ...formData, slotTime: e.target.value })}
            >
              <option value="09:00 AM">09:00 AM</option>
              <option value="09:30 AM">09:30 AM</option>
              <option value="10:00 AM">10:00 AM</option>
              <option value="11:00 AM">11:00 AM</option>
              <option value="11:30 AM">11:30 AM</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Symptoms / Complaint</label>
          <input
            type="text"
            className="form-control"
            value={formData.complaint}
            onChange={(e) => setFormData({ ...formData, complaint: e.target.value })}
            placeholder="e.g. Mild headache, viral fever"
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button type="button" className="btn btn--subtle" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={submitting}
            style={{ background: '#0d9488', borderColor: '#0d9488' }}
          >
            {submitting ? 'Booking...' : 'Confirm Appointment'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
