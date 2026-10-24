import { useState } from 'react'
import ActionCard from '../components/ActionCard.jsx'
import Layout from '../components/Layout.jsx'
import SlipLookup from '../components/SlipLookup.jsx'
import SymptomBox from '../components/SymptomBox.jsx'
import TriageResult from '../components/TriageResult.jsx'
import HospitalLiveBar from '../components/HospitalLiveBar.jsx'
import LiveDepartmentGlance from '../components/LiveDepartmentGlance.jsx'
import DemoToolbar from '../components/staff/DemoToolbar.jsx'
import { useEmergency } from '../context/Emergency.jsx'
import { useI18n } from '../i18n/index.jsx'
import { Link, navigate } from '../router.jsx'
import { Icon } from '../components/common/Icons.jsx'

export default function Home() {
  const { t } = useI18n()
  const { openEmergency } = useEmergency()
  const [slipOpen, setSlipOpen] = useState(false)
  const [result, setResult] = useState(null)

  return (
    <Layout emergencyTo="/new?emergency=1">
      <HospitalLiveBar />

      <section className="home-hero">
        <h1 className="home-hero__title">
          <span>Digital OPD Queue</span>
          <span className="home-hero__gradient">& Indoor Navigation</span>
        </h1>
        <p className="home-hero__subtitle">
          Real-time doctor tokens, multilingual symptom triage, and step-by-step hospital directions.
        </p>
      </section>

      <SymptomBox
        showPhoto
        onResult={(data) => setResult({ type: 'suggestion', data })}
        onEmergency={(detail) => setResult({ type: 'emergency', detail })}
      />

      {result?.type === 'emergency' && (
        <section className="emergency-alert-banner" role="alert">
          <div className="emergency-alert-banner__icon">
            <Icon name="emergency" size={28} />
          </div>
          <div className="emergency-alert-banner__content">
            <strong>Immediate Emergency Attention Required</strong>
            <p>{result.detail.directive}</p>
          </div>
          <button type="button" className="btn btn--danger" onClick={() => openEmergency(result.detail)}>
            <span>Emergency Protocol</span>
            <Icon name="arrow-right" size={16} />
          </button>
        </section>
      )}

      {result?.type === 'suggestion' && (
        <TriageResult result={result.data} onAccept={(code) => navigate(`/new?dept=${code}`)} />
      )}

      <div className="actions-section">
        <h2 className="section-title">Quick Services</h2>
        <div className="actions-grid">
          <ActionCard
            to="/new"
            iconName="ticket"
            variant="blue"
            title={t.cardRegister}
            hint={t.cardRegisterHint}
          />
          <ActionCard
            onClick={() => setSlipOpen(true)}
            iconName="qr"
            variant="teal"
            title={t.cardSlip}
            hint={t.cardSlipHint}
          />
          <ActionCard
            to="/map"
            iconName="map"
            variant="indigo"
            title={t.cardMap}
            hint={t.cardMapHint}
          />
        </div>
      </div>

      <LiveDepartmentGlance />

      <nav className="staff-portal card" aria-label="Hospital staff portal">
        <div className="staff-portal__label">
          <Icon name="doctor" size={18} />
          <span>Staff & Doctor Desks:</span>
        </div>
        <div className="staff-portal__links">
          <Link to="/doctor" className="staff-link">
            <Icon name="user" size={15} />
            <span>{t.linkDoctor}</span>
          </Link>
          <Link to="/board" className="staff-link">
            <Icon name="tv" size={15} />
            <span>{t.linkBoard}</span>
          </Link>
          <Link to="/analytics" className="staff-link">
            <Icon name="chart" size={15} />
            <span>{t.linkAnalytics}</span>
          </Link>
        </div>
      </nav>

      <SlipLookup open={slipOpen} onClose={() => setSlipOpen(false)} />
      <DemoToolbar />
    </Layout>
  )
}
