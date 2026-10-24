import { useI18n } from '../i18n/index.jsx'
import { Icon } from './common/Icons.jsx'

const QUICK_TAGS = [
  {
    icon: 'stethoscope',
    label: { en: 'Fever & Cough', hi: 'बुखार और खांसी', te: 'జ్వరం & దగ్గు' },
    text: { en: 'High fever and persistent cough', hi: 'तेज बुखार और लगातार खांसी', te: 'తీవ్రమైన జ్వరం మరియు నిరంతర దగ్గు' },
  },
  {
    icon: 'activity',
    label: { en: 'BP & Sugar Check', hi: 'बीपी और शुगर जांच', te: 'బీపీ & షుగర్ తనిఖీ' },
    text: { en: 'Blood pressure and diabetes checkup', hi: 'ब्लड प्रेशर और डायबिटीज जांच', te: 'బ్లడ్ ప్రెషర్ మరియు డయాబెటిస్ పరీక్ష' },
  },
  {
    icon: 'bone',
    label: { en: 'Joint & Back Pain', hi: 'जोड़ों और कमर दर्द', te: 'కీళ్ళు & నడుము నొప్పి' },
    text: { en: 'Severe joint and lower back pain', hi: 'गंभीर जोड़ों और पीठ के निचले हिस्से में दर्द', te: 'కీళ్ల నొప్పులు మరియు తీవ్రమైన నడుము నొప్పి' },
  },
  {
    icon: 'child',
    label: { en: 'Child Health', hi: 'बाल स्वास्थ्य', te: 'పిల్లల ఆరోగ్యం' },
    text: { en: 'Child fever, digestion and weakness', hi: 'बच्चे को बुखार, पेट खराब और कमजोरी', te: 'పిల్లల జ్వరం, కడుపు సమస్య మరియు నీరసం' },
  },
  {
    icon: 'ear',
    label: { en: 'Ear / Throat Pain', hi: 'कान / गले में दर्द', te: 'చెవి / గొంతు నొప్పి' },
    text: { en: 'Throat irritation and ear ache', hi: 'गले में खराश और कान में दर्द', te: 'గొంతు నొప్పి మరియు చెవి పోటు' },
  },
  {
    icon: 'eye',
    label: { en: 'Eye Irritation', hi: 'आंखों में जलन', te: 'కంటి సమస్యలు' },
    text: { en: 'Red eyes, itching and blurred vision', hi: 'लाल आंखें, खुजली और धुंधली दृष्टि', te: 'ఎర్రబడిన కళ్లు, దురద మరియు మసక దృష్టి' },
  },
]

export default function QuickSymptomPills({ onSelect }) {
  const { lang, pick } = useI18n()

  const quickHeading = {
    en: 'Quick Symptoms:',
    hi: 'त्वरित लक्षण:',
    te: 'ముఖ్య లక్షణాలు:',
  }[lang] || 'Quick Symptoms:'

  return (
    <div className="quick-pills" aria-label={quickHeading}>
      <div className="quick-pills__label">
        <Icon name="sparkles" size={14} />
        <span>{quickHeading}</span>
      </div>
      <div className="quick-pills__scroller">
        {QUICK_TAGS.map((tag) => {
          const label = pick(tag.label)
          const text = pick(tag.text)
          return (
            <button
              key={tag.icon}
              type="button"
              className="quick-pill"
              onClick={() => onSelect(text)}
            >
              <Icon name={tag.icon} size={14} />
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
