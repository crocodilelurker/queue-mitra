/** Large on/off switch with a visible label (and optional hint). */
export default function Toggle({ label, hint, checked, onChange, icon }) {
  return (
    <label className="toggle">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__track" aria-hidden="true" />
      <span className="toggle__text">
        <strong>
          {icon && <span aria-hidden="true">{icon} </span>}
          {label}
        </strong>
        {hint && <span>{hint}</span>}
      </span>
    </label>
  )
}
