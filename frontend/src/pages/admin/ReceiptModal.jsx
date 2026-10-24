import Modal from '../../components/common/Modal.jsx'
import { Icon } from '../../components/common/Icons.jsx'

export default function ReceiptModal({ bill, onClose }) {
  if (!bill) return null

  const handlePrint = () => {
    window.print()
  }

  const isWaived = bill.paymentStatus === 'waived'
  const isPaid = bill.paymentStatus === 'paid'

  return (
    <Modal open={true} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="receipt-paper">
          <div className="receipt-header">
            <h3 className="receipt-hospital-title">CENTRAL DISTRICT HOSPITAL</h3>
            <div className="receipt-subtitle">Govt. of India • Ayushman Bharat Network</div>
            <div className="receipt-subtitle">OPD REGISTRATION & CONSULTATION RECEIPT</div>
          </div>

          <div className="receipt-row">
            <span>Invoice No:</span>
            <strong>{bill.invoiceNumber}</strong>
          </div>
          <div className="receipt-row">
            <span>Date & Time:</span>
            <span>{new Date(bill.createdAt || Date.now()).toLocaleString('en-IN')}</span>
          </div>

          <div className="receipt-divider" />

          <div className="receipt-row">
            <span>Patient ID:</span>
            <strong>{bill.patientId}</strong>
          </div>
          <div className="receipt-row">
            <span>Patient Name:</span>
            <span>{bill.patientName || 'OPD Patient'}</span>
          </div>
          <div className="receipt-row">
            <span>Department:</span>
            <span style={{ textTransform: 'capitalize' }}>{bill.departmentCode || 'General Medicine'}</span>
          </div>

          <div className="receipt-divider" />

          <div className="receipt-row">
            <span>Standard OPD Fee:</span>
            <span>₹{bill.fee || 20}.00</span>
          </div>

          {bill.discountOrWaiver > 0 && (
            <div className="receipt-row" style={{ color: '#16a34a' }}>
              <span>Subsidy / Waiver:</span>
              <span>-₹{bill.discountOrWaiver}.00</span>
            </div>
          )}

          <div className="receipt-total">
            <span>NET AMOUNT PAYABLE:</span>
            <span>₹{bill.netAmount || 0}.00</span>
          </div>

          <div className="receipt-row">
            <span>Payment Status:</span>
            <strong style={{ color: isWaived ? '#7c3aed' : isPaid ? '#16a34a' : '#d97706', textTransform: 'uppercase' }}>
              {bill.paymentStatus}
            </strong>
          </div>
          <div className="receipt-row">
            <span>Payment Mode:</span>
            <span style={{ textTransform: 'capitalize' }}>{bill.paymentMode || 'cash'}</span>
          </div>

          {isWaived && bill.waiverReason && (
            <div className="receipt-row" style={{ fontSize: '0.8rem', color: '#6d28d9' }}>
              <span>Waiver Category:</span>
              <span>{bill.waiverReason}</span>
            </div>
          )}

          <div className="receipt-footer">
            <p style={{ margin: 0 }}>*** This is a computer generated digital token receipt ***</p>
            <p style={{ margin: '0.2rem 0 0' }}>Valid for consultation on issue date only. No stamp needed.</p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button type="button" className="btn btn--subtle" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn btn--primary" onClick={handlePrint}>
            <Icon name="print" size={16} />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </Modal>
  )
}
