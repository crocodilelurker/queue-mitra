import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n/index.jsx'
import { Icon } from './common/Icons.jsx'

/**
 * Full-screen card to show to any staff member: big type, in the patient's language and in English.
 * lines: [{ label, value, valueEn }]
 */
export default function ShowStaff({ open, onClose, title, titleEn, big, lines = [] }) {
  const { t, lang } = useI18n()
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog ref={ref} className="show-staff" aria-label={title} onClose={onClose}>
      {open && (
        <div className="show-staff__body">
          <p className="show-staff__title">{title}</p>
          {lang !== 'en' && titleEn && (
            <p className="show-staff__title show-staff__title--en" lang="en">
              {titleEn}
            </p>
          )}
          {big && <p className="show-staff__big">{big}</p>}
          <dl className="show-staff__lines">
            {lines.map((l) => (
              <div key={l.label}>
                <dt>{l.label}</dt>
                <dd>
                  {l.value}
                  {lang !== 'en' && l.valueEn && l.valueEn !== l.value && (
                    <span className="show-staff__en" lang="en">
                      {l.valueEn}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <button type="button" className="btn btn--primary btn--block" onClick={onClose}>
            <Icon name="close" size={22} />
            <span>{t.close}</span>
          </button>
        </div>
      )}
    </dialog>
  )
}
