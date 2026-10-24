import { useState } from 'react'
import AdminLayout from './AdminLayout.jsx'
import { api } from '../../api/client.js'
import { useAsync } from '../../hooks/useAsync.js'
import { Loading, ErrorNote } from '../../components/common/Status.jsx'
import { Icon } from '../../components/common/Icons.jsx'

export default function AdvancedReports() {
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedRange, setSelectedRange] = useState('all')

  const { data: overview, loading, error, reload } = useAsync(() => api.adminOverview(), [])
  const { data: bills } = useAsync(() => api.billing(), [])
  const { data: appointments } = useAsync(() => api.appointments(), [])

  if (loading) {
    return (
      <AdminLayout>
        <Loading message="Generating analytics reports..." />
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

  const { kpis, liveQueueMatrix, doctors, financialSummary } = overview || {}

  // Compute departmental volumes from appointments
  const deptCounts = {}
  ;(appointments || []).forEach((apt) => {
    const code = apt.departmentCode || 'general'
    deptCounts[code] = (deptCounts[code] || 0) + 1
  })

  const totalConsultations = appointments?.length || 1

  // Compute common diagnoses
  const diagnosisCounts = {}
  ;(appointments || []).forEach((apt) => {
    if (apt.diagnosis) {
      diagnosisCounts[apt.diagnosis] = (diagnosisCounts[apt.diagnosis] || 0) + 1
    }
  })

  // Export report to CSV
  const handleExportCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Patients Registered', kpis?.totalPatients || 0],
      ['Total Consultations', appointments?.length || 0],
      ['Total Revenue Invoiced (INR)', financialSummary?.totalBilled || 0],
      ['Total Revenue Collected (INR)', financialSummary?.totalCollected || 0],
      ['Total Government Waivers (INR)', financialSummary?.totalWaived || 0],
      ['Pending Bills (INR)', financialSummary?.totalPending || 0],
      [],
      ['Department', 'Consultations Count'],
      ...Object.entries(deptCounts).map(([dept, count]) => [dept, count]),
    ]

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `opd_report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <AdminLayout>
      <div className="admin-section-header">
        <div>
          <h2>
            <Icon name="chart" size={22} color="var(--primary)" />
            <span>OPD Clinical & Financial Analytics</span>
          </h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
            Hospital volume insights, subsidy allocations, and doctor performance metrics
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="btn btn--subtle" onClick={() => window.print()}>
            <Icon name="print" size={16} />
            <span>Print Report</span>
          </button>
          <button type="button" className="btn btn--primary" onClick={handleExportCSV}>
            <Icon name="clipboard" size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Multi-Filter Controls */}
      <div className="card panel" style={{ marginBottom: '1.5rem', background: '#f8fafc' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="filter" size={16} color="var(--ink-muted)" />
            <strong style={{ fontSize: '0.85rem', color: 'var(--ink)' }}>Report Filters:</strong>
          </div>

          <div className="form-group" style={{ minWidth: 160 }}>
            <select
              className="form-control"
              style={{ fontSize: '0.85rem', padding: '0.35rem 0.6rem' }}
              value={selectedRange}
              onChange={(e) => setSelectedRange(e.target.value)}
            >
              <option value="all">Timeframe: All Recorded</option>
              <option value="today">Timeframe: Today's OPD</option>
              <option value="week">Timeframe: Last 7 Days</option>
              <option value="month">Timeframe: This Month</option>
            </select>
          </div>

          <div className="form-group" style={{ minWidth: 180 }}>
            <select
              className="form-control"
              style={{ fontSize: '0.85rem', padding: '0.35rem 0.6rem' }}
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              <option value="">Department: All Clinical Units</option>
              <option value="medicine">General Medicine</option>
              <option value="pediatrics">Pediatrics</option>
              <option value="orthopedics">Orthopedics</option>
              <option value="ent">ENT</option>
              <option value="gynecology">Gynecology</option>
              <option value="dermatology">Dermatology</option>
              <option value="ophthalmology">Ophthalmology</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2-Column Analytics Visual Grids */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Department Consultation Volume Breakdown */}
        <div className="card panel">
          <div className="panel__title">
            <Icon name="hospital-building" size={18} color="var(--primary)" />
            <span>OPD Volume by Department</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
            {liveQueueMatrix?.map((dept) => {
              const count = deptCounts[dept.code] || 0
              const pct = Math.round((count / totalConsultations) * 100)
              return (
                <div key={dept.code}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600 }}>{dept.name} ({dept.nameHi})</span>
                    <span><strong>{count}</strong> visits ({pct}%)</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--surface-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg, var(--primary) 0%, #38bdf8 100%)',
                        borderRadius: '4px',
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Financial Collection vs Subsidy Allocation */}
        <div className="card panel">
          <div className="panel__title">
            <Icon name="currency-inr" size={18} color="var(--ok)" />
            <span>Financial & Subsidy Allocation</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Total Revenue Collected:</span>
                <strong style={{ color: 'var(--ok)', fontSize: '1.1rem' }}>₹{financialSummary?.totalCollected || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Govt Waivers (Ayushman Bharat / 108):</span>
                <strong style={{ color: '#7c3aed', fontSize: '1.1rem' }}>₹{financialSummary?.totalWaived || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Pending Counter Invoices:</span>
                <strong style={{ color: 'var(--warn)', fontSize: '1.1rem' }}>₹{financialSummary?.totalPending || 0}</strong>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Subsidy Coverage Ratio
              </div>
              <div style={{ display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden', background: '#e2e8f0' }}>
                <div
                  style={{
                    width: `${Math.round(((financialSummary?.totalCollected || 1) / ((financialSummary?.totalBilled || 1) || 1)) * 100)}%`,
                    background: 'var(--ok)',
                  }}
                  title="Collected"
                />
                <div
                  style={{
                    width: `${Math.round(((financialSummary?.totalWaived || 0) / ((financialSummary?.totalBilled || 1) || 1)) * 100)}%`,
                    background: '#8b5cf6',
                  }}
                  title="Waived / Subsidized"
                />
                <div
                  style={{
                    width: `${Math.round(((financialSummary?.totalPending || 0) / ((financialSummary?.totalBilled || 1) || 1)) * 100)}%`,
                    background: 'var(--warn)',
                  }}
                  title="Pending"
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.75rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ok)' }} />
                  Cash/UPI ({Math.round(((financialSummary?.totalCollected || 0) / ((financialSummary?.totalBilled || 1) || 1)) * 100)}%)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }} />
                  Waivers ({Math.round(((financialSummary?.totalWaived || 0) / ((financialSummary?.totalBilled || 1) || 1)) * 100)}%)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warn)' }} />
                  Pending ({Math.round(((financialSummary?.totalPending || 0) / ((financialSummary?.totalBilled || 1) || 1)) * 100)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Disease & Diagnosis Insights */}
      <section className="card panel" style={{ marginBottom: '2rem' }}>
        <div className="panel__title">
          <Icon name="med" size={18} color="var(--indigo)" />
          <span>Clinical Diagnosis & Disease Prevalency Insights</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
          {Object.entries(diagnosisCounts).length === 0 ? (
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem' }}>
              No diagnoses recorded yet today. Complete consultations to populate clinical insight statistics.
            </p>
          ) : (
            Object.entries(diagnosisCounts).map(([diagnosis, count]) => (
              <div
                key={diagnosis}
                style={{
                  background: 'var(--surface-subtle)',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
                  Condition Recorded
                </div>
                <strong style={{ fontSize: '0.95rem', color: 'var(--ink)' }}>{diagnosis}</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, marginTop: '0.2rem' }}>
                  {count} Case{count !== 1 ? 's' : ''} Today
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Doctor Consultation Volume Performance */}
      <section className="admin-table-container">
        <div className="admin-table-toolbar">
          <strong style={{ fontSize: '0.95rem', color: 'var(--ink)' }}>
            Doctor Throughput & Performance
          </strong>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Doctor Name</th>
              <th>Department</th>
              <th>Current Status</th>
              <th>Chamber</th>
              <th>Standard Fee</th>
            </tr>
          </thead>
          <tbody>
            {doctors?.map((doc) => (
              <tr key={doc._id}>
                <td>
                  <strong>{doc.name}</strong>
                </td>
                <td>
                  <span style={{ textTransform: 'capitalize' }}>{doc.specialty || 'General'}</span>
                </td>
                <td>
                  <span className={`status-pill status-pill--${doc.status}`}>
                    {doc.status?.replace('_', ' ')}
                  </span>
                </td>
                <td>{doc.room || 'OPD-1'}</td>
                <td>₹{doc.consultationFee ?? 20}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AdminLayout>
  )
}
