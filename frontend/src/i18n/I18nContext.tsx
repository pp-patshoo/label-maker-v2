import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { en } from './en'
import type { Dictionary, TranslationKey } from './en'
import { th } from './th'

export type Lang = 'th' | 'en'

const dictionaries: Record<Lang, Dictionary> = { th, en }
const STORAGE_KEY = 'lang'

function readStoredLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'th' || v === 'en') return v
  } catch {
    /* storage unavailable */
  }
  return 'th'
}

type Vars = Record<string, string | number>

interface I18nValue {
  lang: Lang
  setLang: (lang: Lang) => void
  /** Translate a key; `{name}` placeholders are replaced from `vars`. */
  t: (key: TranslationKey, vars?: Vars) => string
}

function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m))
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* storage unavailable */
    }
  }, [])

  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, t: (key, vars) => interpolate(dictionaries[lang][key] ?? key, vars) }),
    [lang, setLang],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useT(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useT must be used inside <I18nProvider>')
  return ctx
}
