import { useRef } from 'react'
import { useI18n } from '../../i18n/index.jsx'

// Always-visible emergency control for every step of /new. Frontend only: it does not alert the hospital,
// it points the patient to the national emergency number and to the nearest staff.
const EMERGENCY_NUMBER = '112'

export default function EmergencyButton() {
  const { t } = useI18n()
  const dialogRef = useRef(null)
  return (
    <>
      <div className="emergency-bar">
        <button type="button" className="emergency-btn" onClick={() => dialogRef.current?.showModal()}>
          <span aria-hidden="true">⚠</span> {t.emergency}
        </button>
      </div>
      <dialog
        ref={dialogRef}
        className="emergency-dialog box"
        aria-labelledby="emergency-title"
        onClick={(e) => e.target === dialogRef.current && dialogRef.current.close()}
      >
        <h2 id="emergency-title" className="form__title">
          {t.emergencyTitle}
        </h2>
        <p>{t.emergencyBody}</p>
        <p className="path__hint">{t.emergencyNote}</p>
        <div className="form__actions">
          <a className="btn emergency-call" href={`tel:${EMERGENCY_NUMBER}`}>
            {t.emergencyCall} {EMERGENCY_NUMBER}
          </a>
          <button type="button" className="btn" onClick={() => dialogRef.current?.close()}>
            {t.close}
          </button>
        </div>
      </dialog>
    </>
  )
}
