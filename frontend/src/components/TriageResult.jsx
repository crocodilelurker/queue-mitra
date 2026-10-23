import { useDepartments } from '../api/departments.js'
import { useI18n } from '../i18n/index.jsx'
import { DEPARTMENT_ICONS } from './common/DepartmentCard.jsx'
import ListenButton from './common/ListenButton.jsx'

/**
 * A department suggestion. It is only a suggestion: it never says a case is safe or that anyone can wait,
 * and the patient can always pick a different department.
 */
export default function TriageResult({ result, onAccept, onChoose, acceptLabel }) {
  const { t, f, deptName, deptDesc } = useI18n()
  useDepartments() // loads the translated department names
  const dept = result.suggestedDepartment
  const advice = result.preConsultationAdvice
  const speech = `${f('suggestedDept')} ${deptName(dept)}. ${advice}`

  return (
    <section className="box triage" aria-live="polite">
      <h2 className="form__title">{t.suggestedDept}</h2>
      <div className="triage__dept">
        <span className="triage__icon" aria-hidden="true">
          {DEPARTMENT_ICONS[dept.code] || '🏥'}
        </span>
        <div>
          <strong className="triage__name">{deptName(dept)}</strong>
          <p className="field__hint">{deptDesc(dept) || dept.description}</p>
          <p className="field__hint">
            {dept.rooms?.join(', ')} · {f('floorN', { n: dept.floor })} · {f('matchPct', { n: Math.round(result.confidence * 100) })}
          </p>
        </div>
      </div>
      <div className="notice">
        <strong>{t.adviceTitle}</strong>
        <p>{advice}</p>
      </div>
      <p className="field__hint">{t.suggestionNote}</p>
      <div className="form__actions">
        <button type="button" className="btn btn--primary" onClick={() => onAccept(dept.code)}>
          <span aria-hidden="true">📝</span> {acceptLabel || t.registerForDept}
        </button>
        {onChoose && (
          <button type="button" className="btn" onClick={onChoose}>
            <span aria-hidden="true">🔄</span> {t.chooseOther}
          </button>
        )}
        <ListenButton text={speech} />
      </div>
    </section>
  )
}
