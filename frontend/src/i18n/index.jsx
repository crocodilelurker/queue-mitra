import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { lookupDepartment } from '../api/departments.js'
import { fmt } from '../utils/format.js'
import en from './en.js'
import hi from './hi.js'
import te from './te.js'
import { checkpointNameFor, placeNameFor } from './places.js'

const LANGS = { hi, en, te }
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

  const value = useMemo(() => {
    const t = LANGS[lang]
    // Accepts a department object ({ code, name, translations }) or just its code.
    const dept = (d) => (typeof d === 'string' ? lookupDepartment(d) || { code: d, name: d } : d)
    const deptName = (d) => {
      const full = dept(d)
      const known = full.translations ? full : lookupDepartment(full.code) || full
      return lang === 'en' ? full.name : known.translations?.[lang]?.name || full.name
    }
    const deptDesc = (d) => {
      const full = dept(d)
      return lang === 'en' ? full.description || '' : full.translations?.[lang]?.description || full.description || ''
    }
    return {
      lang,
      setLang,
      t,
      langs: LANGS,
      f: (key, vars) => fmt(t[key], vars),
      deptName,
      deptDesc,
      placeName: (place) => placeNameFor(place, lang, deptName, t.room),
      checkpointName: (cp) => checkpointNameFor(cp, lang),
      // Picks the current language from a { en, hi, ... } object returned by the backend. If the backend has no
      // text for this language, `fallbackKey` names a translated string held in the dictionaries; else English.
      pick: (obj, fallbackKey) => (obj ? obj[lang] || (fallbackKey && lang !== 'en' ? t[fallbackKey] : '') || obj.en || '' : ''),
    }
  }, [lang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18n = () => useContext(I18nContext)
