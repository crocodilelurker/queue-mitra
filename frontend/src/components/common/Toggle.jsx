import { Icon } from './Icons.jsx'

/** Modern on/off switch with a visible label, track, and optional icon. */
export default function Toggle({ label, hint, checked, onChange, icon, iconName }) {
  return (
    <label className={`toggle ${checked ? 'toggle--checked' : ''}`}>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle__track" aria-hidden="true">
        <span className="toggle__thumb" />
      </span>
      <span className="toggle__text">
        <strong>
          {iconName && <Icon name={iconName} size={16} />}
          {icon && !iconName && <span aria-hidden="true">{icon} </span>}
          {label}
        </strong>
        {hint && <span>{hint}</span>}
      </span>
    </label>
  )
}
