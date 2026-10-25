import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { lookupDepartment } from '../api/departments.js'
import { fmt } from '../utils/format.js'
import en from './en.js'
import hi from './hi.js'
import te from './te.js'
import ta from './ta.js'
import { checkpointNameFor, landmarkFor, placeNameFor } from './places.js'

// A translation is used only when it has the same {placeholders} as English (else English is shown).
const holes = (v) => (typeof v === 'string' ? (v.match(/\{\w+\}/g) || []).sort().join() : '')
const clean = (dict) => Object.fromEntries(Object.entries(dict).filter(([k, v]) => k in en && typeof v === typeof en[k] && holes(v) === holes(en[k])))

// Order shown in the language picker.
const LANGS = { en, hi: clean(hi), te: clean(te), ta: clean(ta) }
const KEY = 'qm-lang'
const CHOSEN_KEY = 'qm-lang-chosen'
const I18nContext = createContext(null)

function read(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function initialLang() {
  const saved = read(KEY)
  return saved in LANGS ? saved : 'en'
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initialLang)
  // false until the patient has picked a language once (the first-visit picker on Home).
  const [langChosen, setLangChosen] = useState(() => read(CHOSEN_KEY) === '1')

  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem(KEY, lang)
    } catch {
      /* storage unavailable */
    }
  }, [lang])

  const setLang = useCallback((code) => {
    if (!(code in LANGS)) return
    setLangState(code)
    setLangChosen(true)
    try {
      localStorage.setItem(CHOSEN_KEY, '1')
    } catch {
      /* storage unavailable */
    }
  }, [])

  const value = useMemo(() => {
    const t = { ...en, ...LANGS[lang] }
    const f = (key, vars) => fmt(t[key] ?? key, vars)
    // Accepts a department object ({ code, name, translations }) or just its code.
    const dept = (d) => (typeof d === 'string' ? lookupDepartment(d) || { code: d, name: d } : d || {})
    const deptName = (d) => {
      const full = dept(d)
      const known = full.translations ? full : lookupDepartment(full.code) || full
      return (lang !== 'en' && known.translations?.[lang]?.name) || full.name || known.name || full.code || ''
    }
    const deptDesc = (d) => {
      const full = dept(d)
      const known = full.translations || full.description ? full : lookupDepartment(full.code) || full
      return (lang !== 'en' && known.translations?.[lang]?.description) || known.description || ''
    }
    const floorName = (n) => t[`floor${n}`] || f('floorN', { n })
    return {
      lang,
      setLang,
      langChosen,
      t,
      langs: LANGS,
      f,
      deptName,
      deptDesc,
      floorName,
      // Floor name in the middle of a sentence ("on the first floor").
      floorWord: (n) => (lang === 'en' ? floorName(n).toLowerCase() : floorName(n)),
      // "Room 3" from the backend, in the patient's language.
      roomName: (room) => String(room || '').replace(/^Room\b/i, t.room),
      placeName: (place) => placeNameFor(place, lang, t),
      landmark: (place) => landmarkFor(place, lang),
      checkpointName: (cp) => checkpointNameFor(cp, lang),
      // Picks the current language from a { en, hi, ... } object returned by the backend. If the backend has no
      // text for this language, `fallbackKey` names a translated string held in the dictionaries; else English.
      pick: (obj, fallbackKey) => (obj ? obj[lang] || (fallbackKey && lang !== 'en' ? t[fallbackKey] : '') || obj.en || '' : ''),
    }
  }, [lang, langChosen, setLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18n = () => useContext(I18nContext)
