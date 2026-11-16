import type { ReactNode } from 'react'
import { useT } from '../i18n/I18nContext'
import type { TranslationKey } from '../i18n/en'
import styles from './PageTemplate.module.css'

interface PageTemplateProps {
  titleKey: TranslationKey
  children?: ReactNode
}

/** Empty page template shared by every module until real content is added. */
export default function PageTemplate({ titleKey, children }: PageTemplateProps) {
  const { t } = useT()
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t(titleKey)}</h1>
      <div className={styles.body}>
        {children ?? <div className={styles.placeholder}>{t('page.empty')}</div>}
      </div>
    </div>
  )
}
