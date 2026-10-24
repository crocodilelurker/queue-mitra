import { Link } from '../router.jsx'
import { Icon } from './common/Icons.jsx'

/** Modern action card: crisp SVG icon, bold label, clear microcopy, and sleek chevron arrow. */
export default function ActionCard({ iconName = 'ticket', icon, title, hint, to, onClick, variant = 'primary' }) {
  const body = (
    <>
      <div className={`action__icon-badge action__icon-badge--${variant}`}>
        {iconName ? <Icon name={iconName} size={26} /> : <span className="action__icon-fallback">{icon}</span>}
      </div>
      <div className="action__text">
        <strong className="action__title">{title}</strong>
        <span className="action__hint">{hint}</span>
      </div>
      <div className="action__arrow" aria-hidden="true">
        <Icon name="arrow-right" size={20} />
      </div>
    </>
  )

  const className = `action card action--${variant}`
  return to ? (
    <Link to={to} className={className}>
      {body}
    </Link>
  ) : (
    <button type="button" className={className} onClick={onClick}>
      {body}
    </button>
  )
}
