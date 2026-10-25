import { departmentIcon, useDepartments } from '../api/departments.js'
import { useI18n } from '../i18n/index.jsx'
import { Link } from '../router.jsx'
import { Icon } from './common/Icons.jsx'

/** A department SUGGESTION from the problem the patient described. The patient always chooses. */
export default function TriageResult({ result, onAccept }) {
  const { t, f, deptName, deptDesc } = useI18n()
  const { byCode } = useDepartments()
  const live = byCode[result?.suggestedDepartment?.code]

  if (!live) {
    return (
      <section className="notice" aria-live="polite">
        <Icon name="help" size={24} />
        <div>
          <p className="notice__title">{t.suggestNone}</p>
          <Link className="link-strong" to="/map?to=help_desk_0">
            {t.showWayHelpDesk}
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="suggestion" aria-live="polite">
      <p className="suggestion__label">{t.suggestedDept}</p>
      <div className="suggestion__dept">
        <span className="dept-icon" aria-hidden="true">
          <Icon name={departmentIcon(live)} size={28} />
        </span>
        <div>
          <p className="suggestion__name">{deptName(live)}</p>
          {deptDesc(live) && <p className="muted">{deptDesc(live)}</p>}
        </div>
      </div>
      <p className="muted small">{t.suggestionNote}</p>
      <button type="button" className="btn btn--primary btn--block" onClick={() => onAccept(live.code)}>
        <Icon name="check" size={22} />
        <span>{f('chooseThis', { name: deptName(live) })}</span>
      </button>
    </section>
  )
}
