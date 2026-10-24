import { useDepartments } from '../api/departments.js'
import { useI18n } from '../i18n/index.jsx'
import { Icon } from './common/Icons.jsx'
import ListenButton from './common/ListenButton.jsx'

/**
 * Modern clinical recommendation card with department match score, room information, and pre-consultation guidelines.
 */
export default function TriageResult({ result, onAccept, onChoose, acceptLabel }) {
  const { t, f, deptName, deptDesc } = useI18n()
  useDepartments()
  const dept = result.suggestedDepartment
  const advice = result.preConsultationAdvice
  const speech = `${f('suggestedDept')} ${deptName(dept)}. ${advice}`
  const matchPct = Math.round(result.confidence * 100)
  const code = dept.code?.toLowerCase() || 'med'

  return (
    <section className="triage-card card" aria-live="polite">
      <div className="triage-card__header">
        <div className="triage-card__title-wrap">
          <span className="badge badge--ok">
            <Icon name="check" size={13} />
            <span>{f('matchPct', { n: matchPct })} Match</span>
          </span>
          <h2 className="triage-card__title">{t.suggestedDept}</h2>
        </div>
        <ListenButton text={speech} />
      </div>

      <div className="triage-card__body">
        <div className={`triage-card__dept-badge triage-card__dept-badge--${code}`}>
          <Icon name={code} size={30} />
        </div>
        <div className="triage-card__dept-info">
          <strong className="triage-card__dept-name">{deptName(dept)}</strong>
          <p className="triage-card__dept-desc">{deptDesc(dept) || dept.description}</p>
          <div className="triage-card__tags">
            <span className="triage-card__tag">
              <Icon name="map-pin" size={13} />
              <span>Floor {dept.floor}</span>
            </span>
            {dept.rooms?.length > 0 && (
              <span className="triage-card__tag">
                <span>Rooms {dept.rooms.join(', ')}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {advice && (
        <div className="triage-advice">
          <div className="triage-advice__icon">
            <Icon name="sparkles" size={18} />
          </div>
          <div className="triage-advice__content">
            <strong>{t.adviceTitle}</strong>
            <p>{advice}</p>
          </div>
        </div>
      )}

      <p className="triage-disclaimer">{t.suggestionNote}</p>

      <div className="triage-card__actions">
        <button type="button" className="btn btn--primary" onClick={() => onAccept(dept.code)}>
          <Icon name="ticket" size={18} />
          <span>{acceptLabel || t.registerForDept}</span>
        </button>
        {onChoose && (
          <button type="button" className="btn btn--outline" onClick={onChoose}>
            <Icon name="chevron-right" size={18} />
            <span>{t.chooseOther}</span>
          </button>
        )}
      </div>
    </section>
  )
}
