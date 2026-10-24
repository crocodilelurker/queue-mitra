import { useI18n } from '../../i18n/index.jsx'
import { useDepartments } from '../../api/departments.js'
import DepartmentCard from '../common/DepartmentCard.jsx'
import { ErrorNote, Loading } from '../common/Status.jsx'
import { Icon } from '../common/Icons.jsx'

/** "Knowledge" branch: pick the department from the backend's list, as picture cards. */
export default function DepartmentStep({ value, onSelect, onContinue, onDescribe, onBack }) {
  const { t, f, deptName } = useI18n()
  const { list, byCode, loading, error } = useDepartments()
  const chosen = value ? byCode[value] : null

  return (
    <div className="form card">
      <div className="form__header">
        <h2 className="form__title">{t.chooseDept}</h2>
        <p className="form__subtitle">Select the department matching your consultation requirement</p>
      </div>

      {loading && <Loading />}
      <ErrorNote error={error} onRetry={() => window.location.reload()} />

      <div className="dept-grid" role="group" aria-label={t.chooseDept}>
        {list.map((d) => (
          <DepartmentCard key={d.code} department={d} selected={value === d.code} onSelect={onSelect} />
        ))}
      </div>

      {chosen && (
        <div className="selected-dept-banner">
          <Icon name="check" size={16} />
          <span>
            {f('deptChosen', { name: deptName(chosen), rooms: chosen.rooms.join(', '), floor: chosen.floor })}
          </span>
        </div>
      )}

      <button type="button" className="link-btn" onClick={onDescribe}>
        <Icon name="sparkles" size={16} />
        <span>{t.notSure}</span>
      </button>

      <div className="form__actions">
        <button type="button" className="btn btn--outline" onClick={onBack}>
          <Icon name="arrow-left" size={18} />
          <span>{t.back}</span>
        </button>
        <button type="button" className="btn btn--primary" disabled={!value} onClick={onContinue}>
          <span>{t.continue}</span>
          <Icon name="arrow-right" size={18} />
        </button>
      </div>
    </div>
  )
}
