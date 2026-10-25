import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n/index.jsx'
import { canSpeak, speak, stopSpeaking } from '../../utils/speech.js'
import { Icon } from './Icons.jsx'

/** Reads `text` aloud in the current language. Hidden when the browser cannot speak. */
export default function ListenButton({ text, className = 'btn btn--ghost', label }) {
  const { t, lang } = useI18n()
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => () => stopSpeaking(), [])
  if (!canSpeak) return null

  const toggle = () => {
    if (speaking) {
      stopSpeaking()
      setSpeaking(false)
      return
    }
    setSpeaking(true)
    speak(text, lang, { onEnd: () => setSpeaking(false) })
  }

  return (
    <button type="button" className={className} aria-pressed={speaking} onClick={toggle}>
      <Icon name={speaking ? 'stop' : 'volume'} size={22} /> <span>{speaking ? t.stopListening : label || t.listen}</span>
    </button>
  )
}
