import { useDepartments } from '../api/departments.js'
import { Icon } from './common/Icons.jsx'
import { Link } from '../router.jsx'
import { useI18n } from '../i18n/index.jsx'

export default function LiveDepartmentGlance() {
  const { list, loading } = useDepartments()
  const { deptName } = useI18n()

  if (loading || !list.length) return null

  return (
    <section className="live-glance card">
      <div className="live-glance__header">
        <div className="live-glance__title">
          <span className="live-pulse" aria-hidden="true" />
          <h3>Live OPD Counters</h3>
          <span className="live-glance__badge">Floor 1 & Ground</span>
        </div>
        <Link to="/board" className="live-glance__link">
          <span>TV Board</span>
          <Icon name="chevron-right" size={16} />
        </Link>
      </div>

      <div className="live-glance__grid">
        {list.slice(0, 4).map((dept) => (
          <Link
            key={dept.code}
            to={`/new?dept=${dept.code}`}
            className="glance-chip"
            title={`Register for ${deptName(dept)}`}
          >
            <div className="glance-chip__top">
              <span className={`dept-icon-badge dept-icon-badge--${dept.code.toLowerCase()}`}>
                <Icon name={dept.code.toLowerCase()} size={16} />
              </span>
              <span className="glance-chip__code">{dept.code}</span>
            </div>
            <strong className="glance-chip__name">{deptName(dept)}</strong>
            <div className="glance-chip__footer">
              <span className="glance-chip__room">{dept.rooms?.[0] ? `Room ${dept.rooms[0]}` : `Floor ${dept.floor}`}</span>
              <span className="glance-chip__action">Register</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
