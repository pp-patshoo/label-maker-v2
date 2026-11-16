import { useAuth } from '../../auth/AuthContext'
import ChangePasswordForm from '../../auth/ChangePasswordForm'
import PageTemplate from '../../components/PageTemplate'
import { useT } from '../../i18n/I18nContext'
import styles from './SettingsPage.module.css'

export default function SettingsPage() {
  const { t } = useT()
  const { user } = useAuth()

  return (
    <PageTemplate titleKey="menu.settings">
      <div className={styles.sections}>
        <section className={styles.section}>
          <h2 className={styles.heading}>{t('settings.account')}</h2>
          {user && (
            <p className={styles.muted}>
              {t('settings.signedInAs')} <strong className={styles.strong}>{user.displayName}</strong> ({user.username}) ·{' '}
              {t(`role.${user.role}`)}
            </p>
          )}
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>{t('settings.changePassword')}</h2>
          <div className={styles.formWrap}>
            <ChangePasswordForm showSuccess />
          </div>
        </section>
      </div>
    </PageTemplate>
  )
}
