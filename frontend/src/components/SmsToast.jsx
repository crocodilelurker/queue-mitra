import { useEffect } from 'react'
import { useI18n } from '../i18n/index.jsx'
import { formatTime } from '../utils/format.js'
import { Icon } from './common/Icons.jsx'

/** Simulated SMS arriving on the patient's screen, shown like a phone notification. */
export default function SmsToast({ sms, onClose }) {
  const { t, lang, pick } = useI18n()
  useEffect(() => {
    if (!sms) return undefined
    const timer = setTimeout(onClose, 9000)
    return () => clearTimeout(timer)
  }, [sms, onClose])
  if (!sms) return null
  return (
    <div className="sms-toast" role="status">
      <div className="sms-toast__head">
        <Icon name="message" size={16} /> {t.smsFrom} · {formatTime(sms.sentAt, lang)}
        <button type="button" className="sms-toast__close" onClick={onClose} aria-label={t.close}>
          <Icon name="close" size={16} />
        </button>
      </div>
      <p>{pick(sms.message)}</p>
    </div>
  )
}
