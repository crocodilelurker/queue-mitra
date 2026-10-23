import { useI18n } from '../../i18n/index.jsx'
import { useDepartments } from '../../api/departments.js'
import DepartmentCard from '../common/DepartmentCard.jsx'
import { ErrorNote, Loading } from '../common/Status.jsx'

/** "Knowledge" branch: pick the department from the backend's list, as picture cards. */
export default function DepartmentStep({ value, onSelect, onContinue, onDescribe, onBack }) {
  const { t, f, deptName } = useI18n()
  const { list, byCode, loading, error } = useDepartments()
  const chosen = value ? byCode[value] : null

  return (
    <div className="form">
      {loading && <Loading />}
      <ErrorNote error={error} onRetry={() => window.location.reload()} />
      <div className="dept-grid" role="group" aria-label={t.chooseDept}>
        {list.map((d) => (
          <DepartmentCard key={d.code} department={d} selected={value === d.code} onSelect={onSelect} />
        ))}
      </div>
      {chosen && (
        <p className="field__hint" role="status">
          {f('deptChosen', { name: deptName(chosen), rooms: chosen.rooms.join(', '), floor: chosen.floor })}
        </p>
      )}
      <button type="button" className="link-btn" onClick={onDescribe}>
        <span aria-hidden="true">🎙</span> {t.notSure}
      </button>
      <div className="form__actions">
        <button type="button" className="btn" onClick={onBack}>
          <span aria-hidden="true">←</span> {t.back}
        </button>
        <button type="button" className="btn btn--primary" disabled={!value} onClick={onContinue}>
          <span aria-hidden="true">➜</span> {t.continue}
        </button>
      </div>
    </div>
  )
}
