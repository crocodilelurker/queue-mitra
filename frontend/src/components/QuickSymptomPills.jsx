import { Icon } from './common/Icons.jsx'

const QUICK_TAGS = [
  { icon: 'stethoscope', label: 'Fever & Cough', text: 'High fever and persistent cough' },
  { icon: 'activity', label: 'BP & Sugar Check', text: 'Blood pressure and diabetes checkup' },
  { icon: 'bone', label: 'Joint & Back Pain', text: 'Severe joint and lower back pain' },
  { icon: 'child', label: 'Child Health', text: 'Child fever, digestion and weakness' },
  { icon: 'ear', label: 'Ear / Throat Pain', text: 'Throat irritation and ear ache' },
  { icon: 'eye', label: 'Eye Irritation', text: 'Red eyes, itching and blurred vision' },
]

export default function QuickSymptomPills({ onSelect }) {
  return (
    <div className="quick-pills" aria-label="Common symptoms">
      <div className="quick-pills__label">
        <Icon name="sparkles" size={14} />
        <span>Quick Symptoms:</span>
      </div>
      <div className="quick-pills__scroller">
        {QUICK_TAGS.map((tag) => (
          <button
            key={tag.label}
            type="button"
            className="quick-pill"
            onClick={() => onSelect(tag.text)}
          >
            <Icon name={tag.icon} size={14} />
            <span>{tag.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
