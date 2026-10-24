import { useState } from 'react'
import AdminLayout from './AdminLayout.jsx'
import { api } from '../../api/client.js'
import { useAsync } from '../../hooks/useAsync.js'
import { Loading, ErrorNote } from '../../components/common/Status.jsx'
import { Icon } from '../../components/common/Icons.jsx'
import Modal from '../../components/common/Modal.jsx'
import ReceiptModal from './ReceiptModal.jsx'

export default function BillingManager() {
  const [statusFilter, setStatusFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [collectModalBill, setCollectModalBill] = useState(null)
  const [receiptBill, setReceiptBill] = useState(null)

  // Fetch summary stats
  const { data: summary, reload: reloadSummary } = useAsync(() => api.billingSummary(), [])

  // Fetch invoices
  const {
    data: bills,
    loading,
    error,
    reload: reloadBills,
  } = useAsync(
    () =>
      api.billing({
        paymentStatus: statusFilter || undefined,
        search: searchTerm || undefined,
      }),
    [statusFilter, searchTerm]
  )

  const reloadAll = () => {
    reloadSummary(true)
    reloadBills(true)
  }

  return (
    <AdminLayout>
      <div className="admin-section-header">
        <div>
          <h2>
            <Icon name="currency-inr" size={22} color="var(--primary)" />
            <span>Hospital OPD Billing & Government Subsidy Counter</span>
          </h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
            Digital fee collection, Ayushman Bharat waivers, and official token receipts
          </div>
        </div>

        <button type="button" className="btn btn--subtle" onClick={reloadAll}>
          <Icon name="refresh" size={16} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Financial Overview KPI Cards */}
      <div className="admin-metrics-grid">
        <div className="metric-card metric-card--primary">
          <div className="metric-card__header">
            <span className="metric-card__label">Total Invoiced</span>
            <span className="metric-card__icon"><Icon name="bill" size={18} /></span>
          </div>
          <div className="metric-card__value">₹{summary?.totalBilled ?? 0}</div>
          <div className="metric-card__hint">{summary?.invoiceCount ?? 0} Consultations Invoiced</div>
        </div>

        <div className="metric-card metric-card--ok">
          <div className="metric-card__header">
            <span className="metric-card__label">Revenue Collected</span>
            <span className="metric-card__icon"><Icon name="check-circle" size={18} /></span>
          </div>
          <div className="metric-card__value">₹{summary?.totalCollected ?? 0}</div>
          <div className="metric-card__hint">{summary?.paidCount ?? 0} Cash & UPI Transactions</div>
        </div>

        <div className="metric-card metric-card--indigo">
          <div className="metric-card__header">
            <span className="metric-card__label">Subsidies & Waivers</span>
            <span className="metric-card__icon"><Icon name="sparkles" size={18} /></span>
          </div>
          <div className="metric-card__value">₹{summary?.totalWaived ?? 0}</div>
          <div className="metric-card__hint">{summary?.waivedCount ?? 0} Ayushman / Casualty Waivers</div>
        </div>

        <div className="metric-card metric-card--warn">
          <div className="metric-card__header">
            <span className="metric-card__label">Pending Dues</span>
            <span className="metric-card__icon"><Icon name="clock" size={18} /></span>
          </div>
          <div className="metric-card__value">₹{summary?.totalPending ?? 0}</div>
          <div className="metric-card__hint">{summary?.pendingCount ?? 0} Patients at Billing Counter</div>
        </div>
      </div>

      {/* Invoices Ledger Table */}
      <div className="admin-table-container">
        <div className="admin-table-toolbar">
          <div className="admin-search-box">
            <Icon name="search" size={16} color="var(--ink-muted)" />
            <input
              type="text"
              placeholder="Search by Invoice No, Patient ID, or Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <select
              className="form-control"
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending Payment</option>
              <option value="paid">Paid (Cash / UPI)</option>
              <option value="waived">Waived (Govt Subsidy)</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem' }}>
            <Loading message="Loading billing ledger..." />
          </div>
        ) : error ? (
          <div style={{ padding: '2rem' }}>
            <ErrorNote error={error} onRetry={reloadBills} />
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>Date</th>
                <th>Patient Details</th>
                <th>Department</th>
                <th>Standard Fee</th>
                <th>Waiver / Subsidy</th>
                <th>Net Payable</th>
                <th>Payment Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills?.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--ink-muted)' }}>
                    No billing records found matching your filters.
                  </td>
                </tr>
              ) : (
                bills?.map((bill) => (
                  <tr key={bill._id}>
                    <td>
                      <span className="profile-id-badge">{bill.invoiceNumber}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
                        {new Date(bill.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                        {new Date(bill.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--ink)' }}>{bill.patientName}</strong>
                      <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--primary)' }}>
                        {bill.patientId}
                      </div>
                    </td>
                    <td>
                      <span style={{ textTransform: 'capitalize' }}>{bill.departmentCode}</span>
                    </td>
                    <td>₹{bill.fee}</td>
                    <td>
                      {bill.discountOrWaiver > 0 ? (
                        <span style={{ color: 'var(--ok)', fontWeight: 600 }}>
                          -₹{bill.discountOrWaiver}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <strong>₹{bill.netAmount}</strong>
                    </td>
                    <td>
                      <div>
                        <span className={`status-pill status-pill--${bill.paymentStatus}`}>
                          {bill.paymentStatus}
                        </span>
                        {bill.waiverReason && (
                          <div style={{ fontSize: '0.7rem', color: '#6d28d9', marginTop: '0.2rem' }}>
                            {bill.waiverReason}
                          </div>
                        )}
                        {bill.paymentMode && bill.paymentStatus === 'paid' && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', textTransform: 'capitalize' }}>
                            Mode: {bill.paymentMode}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        {bill.paymentStatus === 'pending' ? (
                          <button
                            type="button"
                            className="btn-action-sm btn-action-primary"
                            onClick={() => setCollectModalBill(bill)}
                          >
                            <Icon name="currency-inr" size={13} />
                            <span>Collect</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-action-sm"
                            onClick={() => setReceiptBill(bill)}
                          >
                            <Icon name="bill" size={13} />
                            <span>Receipt</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Collect Payment / Apply Waiver Modal */}
      {collectModalBill && (
        <CollectPaymentModal
          bill={collectModalBill}
          onClose={() => setCollectModalBill(null)}
          onSuccess={(updatedBill) => {
            setCollectModalBill(null)
            reloadAll()
            setReceiptBill(updatedBill)
          }}
        />
      )}

      {/* Official Printable Receipt Modal */}
      {receiptBill && (
        <ReceiptModal bill={receiptBill} onClose={() => setReceiptBill(null)} />
      )}
    </AdminLayout>
  )
}

/** Collect Payment Modal */
function CollectPaymentModal({ bill, onClose, onSuccess }) {
  const [mode, setMode] = useState('cash')
  const [waiverReason, setWaiverReason] = useState('Ayushman Bharat PM-JAY Golden Card')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const isWaiver = mode === 'waiver'
      const payload = {
        paymentMode: isWaiver ? 'exemption' : mode,
        paymentStatus: isWaiver ? 'waived' : 'paid',
        waiverReason: isWaiver ? waiverReason : undefined,
        discountOrWaiver: isWaiver ? bill.fee : 0,
      }
      const res = await api.collectPayment(bill._id, payload)
      onSuccess(res)
    } catch (err) {
      alert('Payment processing failed: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <h3 className="modal__title" style={{ margin: 0 }}>OPD Payment & Subsidy Collection</h3>
          <p className="modal__lead" style={{ margin: '0.2rem 0 0' }}>
            Invoice: <strong>{bill.invoiceNumber}</strong> • Patient: <strong>{bill.patientName}</strong> ({bill.patientId})
          </p>
        </div>

        <div style={{ background: 'var(--surface-subtle)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>Standard OPD Consultation Fee:</span>
            <strong>₹{bill.fee}.00</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, color: 'var(--ink)' }}>
            <span>Amount Due:</span>
            <span>{mode === 'waiver' ? '₹0.00 (Waived)' : `₹${bill.fee}.00`}</span>
          </div>
        </div>

        <div className="form-group">
          <label>Select Payment Mode / Subsidy *</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            <button
              type="button"
              className={`btn ${mode === 'cash' ? 'btn--primary' : 'btn--subtle'}`}
              onClick={() => setMode('cash')}
            >
              Cash Counter
            </button>
            <button
              type="button"
              className={`btn ${mode === 'upi' ? 'btn--primary' : 'btn--subtle'}`}
              onClick={() => setMode('upi')}
            >
              UPI QR
            </button>
            <button
              type="button"
              className={`btn ${mode === 'waiver' ? 'btn--primary' : 'btn--subtle'}`}
              onClick={() => setMode('waiver')}
            >
              Govt Waiver
            </button>
          </div>
        </div>

        {mode === 'upi' && (
          <div style={{ textAlign: 'center', padding: '1rem', background: '#f8fafc', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              Scan Hospital UPI QR Code (₹{bill.fee})
            </div>
            <div style={{ display: 'inline-block', padding: '0.5rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
              <Icon name="qr" size={80} color="var(--ink)" />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: '0.5rem' }}>
              UPI ID: <code style={{ color: 'var(--primary)' }}>centraldistrict.opd@upi</code>
            </div>
          </div>
        )}

        {mode === 'waiver' && (
          <div className="form-group">
            <label>Government Subsidy / Exemption Scheme *</label>
            <select
              className="form-control"
              value={waiverReason}
              onChange={(e) => setWaiverReason(e.target.value)}
            >
              <option value="Ayushman Bharat PM-JAY Golden Card">Ayushman Bharat PM-JAY Golden Card (100% Free)</option>
              <option value="Emergency Casualty 108 Bypass Exemption">Emergency Casualty 108 / 112 Bypass Exemption</option>
              <option value="Senior Citizen (70+) BPL Waiver">Senior Citizen (70+) BPL Waiver</option>
              <option value="Maternal & Child Health Free OPD">Maternal & Child Health Free OPD</option>
              <option value="Medical Officer Discretionary Exemption">Medical Officer Discretionary Exemption</option>
            </select>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button type="button" className="btn btn--subtle" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Processing...' : mode === 'waiver' ? 'Authorize Waiver & Issue Receipt' : 'Confirm Payment & Print'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
