import { useI18n } from '../i18n/index.jsx'
import { Icon } from './common/Icons.jsx'

export default function HospitalLiveBar() {
  const { lang } = useI18n()

  const liveText = {
    en: 'CDH OPD ACTIVE',
    hi: 'सीडीएच ओपीडी सक्रिय',
    te: 'CDH OPD సేవలు ప్రత్యక్షం',
  }[lang] || 'CDH OPD ACTIVE'

  const avgWaitText = {
    en: 'Avg Wait: ~15m',
    hi: 'औसत प्रतीक्षा: ~15 मिनट',
    te: 'సగటు నిరీక్షణ: ~15 నిమి',
  }[lang] || 'Avg Wait: ~15m'

  const opdsText = {
    en: '7 OPDs Open',
    hi: '7 ओपीडी चालू',
    te: '7 OPDలు తెరిచి ఉన్నాయి',
  }[lang] || '7 OPDs Open'

  const hospName = {
    en: 'City District Hospital',
    hi: 'सिटी डिस्ट्रिक्ट हॉस्पिटल',
    te: 'సిటీ డిస్ట్రిక్ట్ హాస్పిటల్',
  }[lang] || 'City District Hospital'

  return (
    <div className="hospital-live-bar">
      <div className="hospital-live-bar__info">
        <span className="live-beacon">
          <span className="live-beacon__dot" />
          <span className="live-beacon__text">{liveText}</span>
        </span>
        <span className="hospital-live-bar__divider" />
        <span className="hospital-live-bar__name">{hospName}</span>
      </div>
      <div className="hospital-live-bar__meta">
        <span className="hospital-live-bar__tag">
          <Icon name="clock" size={13} />
          <span>{avgWaitText}</span>
        </span>
        <span className="hospital-live-bar__tag hospital-live-bar__tag--accent">
          <Icon name="stethoscope" size={13} />
          <span>{opdsText}</span>
        </span>
      </div>
    </div>
  )
}
