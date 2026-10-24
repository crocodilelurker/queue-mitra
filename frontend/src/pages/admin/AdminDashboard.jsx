import { useState } from 'react'
import AdminLayout from './AdminLayout.jsx'
import { api } from '../../api/client.js'
import { useAsync } from '../../hooks/useAsync.js'
import { useSocket } from '../../api/socket.js'
import { Loading, ErrorNote } from '../../components/common/Status.jsx'
import { Icon } from '../../components/common/Icons.jsx'
import { Link, navigate } from '../../router.jsx'
import ReceiptModal from './ReceiptModal.jsx'

export default function AdminDashboard() {
  const { data, loading, error, reload } = useAsync(() => api.adminOverview(), [])
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [statusUpdating, setStatusUpdating] = useState(false)

  // Real-time live updates via WebSockets
  useSocket({
    on: {
      'queue:updated': () => reload(true),
      'ticket:created': () => reload(true),
      'ticket:called': () => reload(true),
      'ticket:completed': () => reload(true),
    },
  })

  const handleUpdateDoctorStatus = async (doctorId, nextStatus) => {
    setStatusUpdating(true)
    try {
      await api.updateDoctorStatus(doctorId, nextStatus)
      await reload(true)
    } catch (err) {
      alert('Failed to update doctor status: ' + err.message)
    } finally {
      setStatusUpdating(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <Loading message="Loading Hospital OPD Live Overview..." />
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

  const { kpis, liveQueueMatrix, dailySchedule, doctors, financialSummary } = data || {}

  return (
    <AdminLayout>
      {/* 1. Real-Time KPI Cards (0:45 - 1:05) */}
      <div className="admin-metrics-grid">
        <div className="metric-card metric-card--primary">
          <div className="metric-card__header">
            <span className="metric-card__label">Total Registered</span>
            <span className="metric-card__icon"><Icon name="users" size={18} /></span>
          </div>
          <div className="metric-card__value">{kpis?.totalPatients ?? 0}</div>
          <div className="metric-card__hint">Hospital Patient Registry</div>
        </div>

        <div className="metric-card metric-card--indigo">
          <div className="metric-card__header">
            <span className="metric-card__label">Active Appointments</span>
            <span className="metric-card__icon"><Icon name="calendar" size={18} /></span>
          </div>
          <div className="metric-card__value">{kpis?.activeAppointments ?? 0}</div>
          <div className="metric-card__hint">Booked for Today</div>
        </div>

        <div className="metric-card metric-card--warn">
          <div className="metric-card__header">
            <span className="metric-card__label">Live Waiting Queue</span>
            <span className="metric-card__icon"><Icon name="queue" size={18} /></span>
          </div>
          <div className="metric-card__value">{kpis?.waitingInQueue ?? 0}</div>
          <div className="metric-card__hint">Across All 7 OPD Depts</div>
        </div>

        <div className="metric-card metric-card--ok">
          <div className="metric-card__header">
            <span className="metric-card__label">Completed Visits</span>
            <span className="metric-card__icon"><Icon name="check-circle" size={18} /></span>
          </div>
          <div className="metric-card__value">{kpis?.completedToday ?? 0}</div>
          <div className="metric-card__hint">Consultations finished</div>
        </div>

        <div className="metric-card metric-card--teal">
          <div className="metric-card__header">
            <span className="metric-card__label">Doctors On Duty</span>
            <span className="metric-card__icon"><Icon name="doctor" size={18} /></span>
          </div>
          <div className="metric-card__value">{kpis?.availableDoctors ?? 0} / {kpis?.totalDoctors ?? 0}</div>
          <div className="metric-card__hint">Active In OPD Chambers</div>
        </div>

        <div className="metric-card metric-card--danger">
          <div className="metric-card__header">
            <span className="metric-card__label">Pending Payments</span>
            <span className="metric-card__icon"><Icon name="currency-inr" size={18} /></span>
          </div>
          <div className="metric-card__value">₹{(kpis?.pendingPayments ?? 0) * 20}</div>
          <div className="metric-card__hint">{kpis?.pendingPayments ?? 0} Invoices Pending</div>
        </div>
      </div>

      {/* 2. Live OPD Queue Visual Tracker (0:45 - 1:05) */}
      <section style={{ marginBottom: '2rem' }}>
        <div className="admin-section-header">
          <h2>
            <Icon name="pulse" size={20} color="var(--primary)" />
            <span>Live OPD Queue Visual Tracker</span>
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn-action-sm"
              onClick={() => reload(true)}
              title="Refresh live feeds"
            >
              <Icon name="refresh" size={14} />
              <span>Refresh</span>
            </button>
            <Link to="/board" className="btn-action-sm btn-action-primary" target="_blank">
              <Icon name="tv" size={14} />
              <span>Full TV Display</span>
            </Link>
          </div>
        </div>

        <div className="opd-tracker-grid">
          {liveQueueMatrix?.map((dept) => {
            const congestionClass =
              dept.congestionLevel === 'high'
                ? 'congestion-badge--high'
                : dept.congestionLevel === 'moderate'
                ? 'congestion-badge--moderate'
                : 'congestion-badge--low'

            return (
              <div key={dept.code} className="opd-dept-card">
                <div className="opd-dept-card__top">
                  <div>
                    <h3 className="opd-dept-card__name">{dept.name}</h3>
                    <div className="opd-dept-card__sub">{dept.nameHi} • Room {dept.code.toUpperCase()}</div>
                  </div>
                  <span className={`congestion-badge ${congestionClass}`}>
                    {dept.congestionLevel}
                  </span>
                </div>

                <div className="opd-dept-card__tokens">
                  <div className="opd-token-box opd-token-box--active">
                    <div className="opd-token-box__label">Calling Now</div>
                    <div className="opd-token-box__value">{dept.activeTokens?.[0] || '—'}</div>
                  </div>
                  <div className="opd-token-box">
                    <div className="opd-token-box__label">In Waiting</div>
                    <div className="opd-token-box__value">{dept.waitingCount}</div>
                  </div>
                </div>

                <div className="opd-dept-card__footer">
                  <span className="doctor-count-pill">
                    <Icon name="doctor" size={13} />
                    <span>{dept.activeDoctors} Doctor{dept.activeDoctors !== 1 ? 's' : ''} Active</span>
                  </span>
                  <span>Avg: ~{dept.avgWaitMinutes} min</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 3. Daily Schedule Feed & Doctor Availability Roster (1:05) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Today's Schedule Feed */}
        <section className="admin-table-container">
          <div className="admin-table-toolbar">
            <div>
              <strong style={{ fontSize: '1rem', color: 'var(--ink)' }}>Today's OPD Schedule</strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
                {dailySchedule?.length || 0} Appointments Scheduled
              </div>
            </div>
            <Link to="/admin/appointments" className="btn-action-sm btn-action-primary">
              <Icon name="plus" size={14} />
              <span>Book Appointment</span>
            </Link>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Time / Slot</th>
                <th>Patient Details</th>
                <th>Department</th>
                <th>Doctor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {dailySchedule?.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--ink-muted)' }}>
                    No appointments scheduled for today yet. Click "Book Appointment" to register visits.
                  </td>
                </tr>
              ) : (
                dailySchedule?.map((apt) => (
                  <tr key={apt._id}>
                    <td>
                      <strong>{apt.slotTime || '09:00 AM'}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', textTransform: 'capitalize' }}>
                        {apt.type?.replace('_', ' ')}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{apt.patientName}</div>
                      <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--primary)' }}>
                        {apt.patientId}
                      </div>
                    </td>
                    <td>
                      <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>
                        {apt.departmentCode}
                      </span>
                    </td>
                    <td>{apt.doctorName || 'Assigned Duty Doctor'}</td>
                    <td>
                      <span className={`status-pill status-pill--${apt.status}`}>
                        {apt.status?.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* Doctor Availability & Chambers Roster */}
        <section className="admin-table-container">
          <div className="admin-table-toolbar">
            <div>
              <strong style={{ fontSize: '1rem', color: 'var(--ink)' }}>Doctors Roster</strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>Chamber Availability & Fee</div>
            </div>
            <Link to="/admin/appointments" className="btn-action-sm">
              <span>View All</span>
            </Link>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Specialty</th>
                <th>Status</th>
                <th>Toggle</th>
              </tr>
            </thead>
            <tbody>
              {doctors?.map((doc) => {
                const isOnDuty = doc.status === 'on_duty' || doc.status === 'in_consultation'
                return (
                  <tr key={doc._id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{doc.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                        Fee: ₹{doc.consultationFee ?? 20}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
                        {doc.specialty || 'General'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill status-pill--${doc.status}`}>
                        {doc.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        disabled={statusUpdating}
                        className="btn-action-sm"
                        style={{ fontSize: '0.7rem' }}
                        onClick={() =>
                          handleUpdateDoctorStatus(doc._id, isOnDuty ? 'off_duty' : 'on_duty')
                        }
                      >
                        {isOnDuty ? 'Go Off Duty' : 'Set On Duty'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      </div>

      {/* Quick Action Navigation Strip */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          borderRadius: 'var(--radius)',
          padding: '1.25rem 1.5rem',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Hospital OPD Quick Actions</h3>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
            Fast patient registration, appointment scheduling, and subsidized billing collection.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn--surface"
            style={{ color: 'var(--ink)' }}
            onClick={() => navigate('/admin/patients?register=1')}
          >
            <Icon name="plus" size={16} />
            <span>New Patient Registration</span>
          </button>
          <button
            type="button"
            className="btn btn--surface"
            style={{ color: 'var(--ink)' }}
            onClick={() => navigate('/admin/appointments?book=1')}
          >
            <Icon name="calendar" size={16} />
            <span>Book Appointment</span>
          </button>
          <button
            type="button"
            className="btn btn--surface"
            style={{ color: 'var(--ink)' }}
            onClick={() => navigate('/admin/billing')}
          >
            <Icon name="currency-inr" size={16} />
            <span>Billing Counter</span>
          </button>
        </div>
      </section>

      {/* Receipt Modal if triggered */}
      {selectedReceipt && (
        <ReceiptModal bill={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
      )}
    </AdminLayout>
  )
}
