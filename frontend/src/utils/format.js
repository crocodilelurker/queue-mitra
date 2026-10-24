/** Fills {placeholders} in a translated string. */
export function fmt(template = '', vars = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key) => (vars[key] ?? ''))
}

export function formatTime(value, lang = 'en') {
  if (!value) return ''
  const locale = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN', ta: 'ta-IN' }[lang] || 'en-IN'
  return new Date(value).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
}
