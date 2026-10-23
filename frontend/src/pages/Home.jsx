import { useState } from 'react'
import ActionCard from '../components/ActionCard.jsx'
import Layout from '../components/Layout.jsx'
import SlipLookup from '../components/SlipLookup.jsx'
import SymptomBox from '../components/SymptomBox.jsx'
import TriageResult from '../components/TriageResult.jsx'
import DemoToolbar from '../components/staff/DemoToolbar.jsx'
import { useEmergency } from '../context/Emergency.jsx'
import { useI18n } from '../i18n/index.jsx'
import { Link, navigate } from '../router.jsx'

export default function Home() {
  const { t } = useI18n()
  const { openEmergency } = useEmergency()
  const [slipOpen, setSlipOpen] = useState(false)
  const [result, setResult] = useState(null) // { type: 'suggestion', data } | { type: 'emergency', detail }

  return (
    <Layout emergencyTo="/new?emergency=1">
      <h1 className="hero">{t.tagline}</h1>

      <SymptomBox
        showPhoto
        onResult={(data) => setResult({ type: 'suggestion', data })}
        onEmergency={(detail) => setResult({ type: 'emergency', detail })}
      />

      {result?.type === 'emergency' && (
        <section className="emergency-note" role="alert">
          <p>{result.detail.directive}</p>
          <button type="button" className="btn btn--danger" onClick={() => openEmergency(result.detail)}>
            <span aria-hidden="true">⚠</span> {t.showEmergencyHelp}
          </button>
        </section>
      )}
      {result?.type === 'suggestion' && (
        <TriageResult result={result.data} onAccept={(code) => navigate(`/new?dept=${code}`)} />
      )}

      <div className="actions">
        <ActionCard to="/new" icon="📝" title={t.cardRegister} hint={t.cardRegisterHint} />
        <ActionCard onClick={() => setSlipOpen(true)} icon="🎟️" title={t.cardSlip} hint={t.cardSlipHint} />
        <ActionCard to="/map" icon="🗺️" title={t.cardMap} hint={t.cardMapHint} />
      </div>

      <nav className="staff-links" aria-label="Hospital staff">
        <span>{t.staffLinks}</span>
        <Link to="/doctor">{t.linkDoctor}</Link>
        <Link to="/board">{t.linkBoard}</Link>
        <Link to="/analytics">{t.linkAnalytics}</Link>
      </nav>

      <SlipLookup open={slipOpen} onClose={() => setSlipOpen(false)} />
      <DemoToolbar />
    </Layout>
  )
}
