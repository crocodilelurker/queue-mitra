import { Icon } from './common/Icons.jsx'

export default function HospitalLiveBar() {
  return (
    <div className="hospital-live-bar">
      <div className="hospital-live-bar__info">
        <span className="live-beacon">
          <span className="live-beacon__dot" />
          <span className="live-beacon__text">CDH OPD ACTIVE</span>
        </span>
        <span className="hospital-live-bar__divider" />
        <span className="hospital-live-bar__name">City District Hospital</span>
      </div>
      <div className="hospital-live-bar__meta">
        <span className="hospital-live-bar__tag">
          <Icon name="clock" size={13} />
          <span>Avg Wait: ~15m</span>
        </span>
        <span className="hospital-live-bar__tag hospital-live-bar__tag--accent">
          <Icon name="stethoscope" size={13} />
          <span>7 OPDs Open</span>
        </span>
      </div>
    </div>
  )
}
