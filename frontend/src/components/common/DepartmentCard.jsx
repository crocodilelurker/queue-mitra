import { useI18n } from '../../i18n/index.jsx'

export const DEPARTMENT_ICONS = { MED: '🩺', CHD: '🧒', WOM: '🤰', ORT: '🦴', ENT: '👂', EYE: '👁️', SKN: '🧴' }

/** Picture card for one department, described in plain words. */
export default function DepartmentCard({ department, selected, onSelect }) {
  const { deptName, deptDesc } = useI18n()
  return (
    <button type="button" className="dept-card" aria-pressed={selected} onClick={() => onSelect(department.code)}>
      <span className="dept-card__icon" aria-hidden="true">
        {DEPARTMENT_ICONS[department.code] || '🏥'}
      </span>
      <span className="dept-card__text">
        <strong>{deptName(department)}</strong>
        <span>{deptDesc(department)}</span>
      </span>
    </button>
  )
}
