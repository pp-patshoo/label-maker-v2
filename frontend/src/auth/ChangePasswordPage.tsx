import { Navigate, useNavigate } from 'react-router-dom'
import LanguageToggle from '../components/LanguageToggle'
import form from '../components/Form.module.css'
import { useT } from '../i18n/I18nContext'
import { useAuth } from './AuthContext'
import ChangePasswordForm from './ChangePasswordForm'
import styles from './LoginPage.module.css'

/** Shown right after sign-in while the user still has a temporary password. */
export default function ChangePasswordPage() {
  const { t } = useT()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (user && !user.mustChangePassword) return <Navigate to="/" replace />

  const signOut = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className={styles.screen}>
      <div className={styles.langCorner}>
        <LanguageToggle />
      </div>

      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.appName}>{t('app.name')}</div>
          <h1 className={styles.title}>{t('password.forced.title')}</h1>
          <p className={styles.subtitle}>{t('password.forced.subtitle')}</p>
        </div>

        <ChangePasswordForm fullWidthButton onChanged={() => navigate('/', { replace: true })} />

        <button type="button" className={form.linkButton} onClick={signOut}>
          {t('password.forced.signOut')}
        </button>
      </div>
    </div>
  )
}
