import { LoaderCircle } from 'lucide-react'
import { useT } from '../i18n/I18nContext'
import styles from './LoadingScreen.module.css'

export default function LoadingScreen() {
  const { t } = useT()
  return (
    <div className={styles.screen} role="status">
      <LoaderCircle size={20} strokeWidth={1.5} className={styles.spinner} aria-hidden />
      <span>{t('page.loading')}</span>
    </div>
  )
}
