import LanguagePicker from '../components/LanguagePicker.jsx'
import Layout from '../components/Layout.jsx'
import LiveLine from '../components/LiveLine.jsx'
import UrgentHelp from '../components/UrgentHelp.jsx'
import ListenButton from '../components/common/ListenButton.jsx'
import { Icon } from '../components/common/Icons.jsx'
import { useI18n } from '../i18n/index.jsx'
import { Link } from '../router.jsx'

function BigButton({ to, icon, title, hint, tone = 'default' }) {
  return (
    <Link to={to} className={`big-btn big-btn--${tone}`}>
      <span className="big-btn__icon" aria-hidden="true">
        <Icon name={icon} size={32} />
      </span>
      <span className="big-btn__text">
        <span className="big-btn__title">{title}</span>
        {hint && <span className="big-btn__hint">{hint}</span>}
      </span>
      <Icon name="chevron-right" size={24} className="big-btn__chev" />
    </Link>
  )
}

export default function Home() {
  const { t, lang, langs, langChosen } = useI18n()

  // First visit: ask for a language before anything else.
  if (!langChosen) {
    return (
      <Layout>
        <section className="intro">
          <h1 className="page-title page-title--icon">
            <Icon name="globe" size={30} />
            <span>{t.pickLanguageTitle}</span>
          </h1>
          <p className="lead">
            {Object.entries(langs)
              .filter(([code]) => code !== lang)
              .map(([code, d]) => (
                <span key={code} lang={code} className="lead__alt">
                  {d.pickLanguageTitle}
                </span>
              ))}
          </p>
        </section>
        <LanguagePicker />
      </Layout>
    )
  }

  const spoken = [t.homeTitle, t.homeCalm, t.cardRegister, t.cardSlip, t.cardMap, t.emergency].join('. ')

  return (
    <Layout
      footer={
        <Link to="/login" className="footer-link">
          {t.staffLogin}
        </Link>
      }
    >
      <section className="intro">
        <h1 className="page-title">{t.homeTitle}</h1>
        <p className="lead">{t.homeCalm}</p>
        <LiveLine />
      </section>

      <nav className="big-grid" aria-label={t.homeTitle}>
        <BigButton to="/register" icon="ticket" title={t.cardRegister} hint={t.cardRegisterHint} tone="primary" />
        <BigButton to="/my-slip" icon="qr" title={t.cardSlip} hint={t.cardSlipHint} />
        <BigButton to="/map" icon="map" title={t.cardMap} hint={t.cardMapHint} />
        <BigButton to="/emergency" icon="emergency" title={t.emergency} hint={t.cardEmergencyHint} tone="danger" />
      </nav>

      <UrgentHelp />
      <ListenButton text={spoken} label={t.listenPage} />
    </Layout>
  )
}
