import { useI18n } from '../../i18n/index.jsx'
import { Icon } from './Icons.jsx'

/** Picture card for one department with crisp SVG icon and clean visual state. */
export default function DepartmentCard({ department, selected, onSelect }) {
  const { deptName, deptDesc } = useI18n()
  const code = department.code.toLowerCase()

  return (
    <button
      type="button"
      className={`dept-card ${selected ? 'dept-card--selected' : ''}`}
      aria-pressed={selected}
      onClick={() => onSelect(department.code)}
    >
      <div className={`dept-card__icon-box dept-card__icon-box--${code}`}>
        <Icon name={code} size={24} />
      </div>
      <div className="dept-card__text">
        <strong className="dept-card__title">{deptName(department)}</strong>
        <span className="dept-card__desc">{deptDesc(department)}</span>
        <span className="dept-card__meta">
          {department.rooms?.[0] ? `${department.rooms[0]} • Floor ${department.floor}` : `Floor ${department.floor}`}
        </span>
      </div>
      <div className="dept-card__check" aria-hidden="true">
        {selected ? <Icon name="check" size={16} /> : <span className="dept-card__dot" />}
      </div>
    </button>
  )
}
