import { Languages } from 'lucide-react'
import { useT } from '../i18n/I18nContext'
import type { Lang } from '../i18n/I18nContext'
import styles from './LanguageToggle.module.css'

const LANGS: { code: Lang; label: string }[] = [
  { code: 'th', label: 'TH' },
  { code: 'en', label: 'EN' },
]

interface LanguageToggleProps {
  /** Compact mode (collapsed sidebar): a single button that cycles the language. */
  compact?: boolean
}

export default function LanguageToggle({ compact = false }: LanguageToggleProps) {
  const { lang, setLang, t } = useT()

  if (compact) {
    const next: Lang = lang === 'th' ? 'en' : 'th'
    return (
      <button
        type="button"
        className={styles.compact}
        onClick={() => setLang(next)}
        title={`${t('sidebar.language')}: ${lang.toUpperCase()}`}
        aria-label={`${t('sidebar.language')}: ${lang.toUpperCase()}`}
      >
        {lang.toUpperCase()}
      </button>
    )
  }

  return (
    <div className={styles.group} role="group" aria-label={t('sidebar.language')}>
      <Languages size={16} strokeWidth={1.5} className={styles.icon} aria-hidden />
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          className={styles.option}
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
