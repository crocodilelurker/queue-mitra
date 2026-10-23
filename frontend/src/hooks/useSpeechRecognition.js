import { useCallback, useEffect, useRef, useState } from 'react'

const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

/** Browser speech-to-text. `onResult(text)` receives the final transcript. */
export function useSpeechRecognition({ lang, onResult }) {
  const [listening, setListening] = useState(false)
  const ref = useRef(null)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  useEffect(() => () => ref.current?.abort(), [])

  const stop = useCallback(() => ref.current?.stop(), [])

  const start = useCallback(() => {
    if (!Recognition) return
    const rec = new Recognition()
    rec.lang = lang
    rec.interimResults = false
    rec.onresult = (e) => onResultRef.current(e.results[0][0].transcript)
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    ref.current = rec
    rec.start()
    setListening(true)
  }, [lang])

  return { supported: Boolean(Recognition), listening, start, stop }
}
