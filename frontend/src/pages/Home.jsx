import { useI18n } from '../i18n/index.jsx'
import Header from '../components/Header.jsx'
import OfflineBanner from '../components/OfflineBanner.jsx'
import SymptomInput from '../components/SymptomInput.jsx'
import PathCard from '../components/PathCard.jsx'
import OptionButton from '../components/OptionButton.jsx'

export default function Home() {
  const { t } = useI18n()
  return (
    <>
      <OfflineBanner />
      <div className="page">
        <Header />
        <main className="main">
          <h1 className="hero">{t.tagline}</h1>
          <SymptomInput />
          <div className="paths">
            <PathCard title={t.knowTitle}>
              <OptionButton>{t.opd}</OptionButton>
              <OptionButton tone="danger">{t.emergency}</OptionButton>
              <OptionButton>{t.pharmacy}</OptionButton>
            </PathCard>
            <PathCard title={t.notSureTitle} hint={t.notSureHint}>
              <OptionButton tone="danger">{t.emergency}</OptionButton>
              <OptionButton>{t.getHelp}</OptionButton>
            </PathCard>
          </div>
        </main>
      </div>
    </>
  )
}
