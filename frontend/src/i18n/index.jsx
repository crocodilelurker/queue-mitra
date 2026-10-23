import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import en from './en.js'
import hi from './hi.js'

const LANGS = { en, hi }
const KEY = 'qm-lang'
const I18nContext = createContext(null)

function initialLang() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved in LANGS) return saved
  } catch {
    /* storage unavailable */
  }
  return 'en'
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(initialLang)

  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem(KEY, lang)
    } catch {
      /* storage unavailable */
    }
  }, [lang])

  const value = useMemo(() => ({ lang, setLang, t: LANGS[lang], langs: LANGS }), [lang])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18n = () => useContext(I18nContext)
