// Text-to-speech helpers (Web Speech API). Hide the feature when the browser has no speech support.
export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

export const SPEECH_LANG = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN', ta: 'ta-IN' }

export function speak(text, lang = 'en', { onEnd } = {}) {
  if (!canSpeak || !text) return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = SPEECH_LANG[lang] || 'en-IN'
  // Prefer an installed voice for the language; otherwise the browser falls back to its default.
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang === utter.lang) ||
    window.speechSynthesis.getVoices().find((v) => v.lang.startsWith(lang))
  if (voice) utter.voice = voice
  utter.rate = 0.9
  if (onEnd) {
    utter.onend = onEnd
    utter.onerror = onEnd
  }
  window.speechSynthesis.speak(utter)
}

export function stopSpeaking() {
  if (canSpeak) window.speechSynthesis.cancel()
}
