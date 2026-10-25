import { useSpeechRecognition } from '../hooks/useSpeechRecognition.js'
import { useI18n } from '../i18n/index.jsx'
import { Icon } from './common/Icons.jsx'

/** Big microphone button: speak instead of typing. Hidden where the browser cannot listen. */
export default function MicButton({ onText, className = '' }) {
  const { t } = useI18n()
  const { supported, listening, start, stop } = useSpeechRecognition({ lang: t.speechLang, onResult: onText })
  if (!supported) return null
  return (
    <button
      type="button"
      className={`btn btn--mic${listening ? ' is-listening' : ''} ${className}`.trim()}
      aria-pressed={listening}
      onClick={listening ? stop : start}
    >
      <Icon name={listening ? 'mic-stop' : 'mic'} size={24} />
      <span>{listening ? t.micStop : t.mic}</span>
    </button>
  )
}
