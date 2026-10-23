import { Link } from '../router.jsx'

/** Large primary action: icon, bold label and one line of help. Renders a link or a button. */
export default function ActionCard({ icon, title, hint, to, onClick }) {
  const body = (
    <>
      <span className="action__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="action__text">
        <strong>{title}</strong>
        <span>{hint}</span>
      </span>
    </>
  )
  const className = 'action'
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
