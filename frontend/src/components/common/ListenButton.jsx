import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n/index.jsx'
import { canSpeak, speak, stopSpeaking } from '../../utils/speech.js'

/** Reads `text` aloud in the current language. Hidden when the browser cannot speak. */
export default function ListenButton({ text, className = 'btn' }) {
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
      <span aria-hidden="true">{speaking ? '■' : '🔊'}</span> {speaking ? t.stopListening : t.listen}
    </button>
  )
}
