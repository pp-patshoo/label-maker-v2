import type { ReactNode } from 'react'
import { useT } from '../i18n/I18nContext'
import type { TranslationKey } from '../i18n/en'
import styles from './Toolbar.module.css'

interface ToolbarProps {
  /** Left side (e.g. primary action or summary text) */
  children?: ReactNode
  /** Right side (e.g. refresh button) */
  end?: ReactNode
  /** Shown on the right, before `end` */
  error?: TranslationKey | null
}

export default function Toolbar({ children, end, error }: ToolbarProps) {
  const { t } = useT()
  return (
    <div className={styles.toolbar}>
      <div>{children}</div>
      <div className={styles.end}>
        {error && <span className={styles.error}>{t(error)}</span>}
        {end}
      </div>
    </div>
  )
}
