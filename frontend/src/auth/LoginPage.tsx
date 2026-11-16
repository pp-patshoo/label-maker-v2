import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import LanguageToggle from '../components/LanguageToggle'
import LoadingScreen from '../components/LoadingScreen'
import { useT } from '../i18n/I18nContext'
import type { TranslationKey } from '../i18n/en'
import { useAuth } from './AuthContext'
import { AuthError } from './authService'
import styles from './LoginPage.module.css'

/** Only allow same-app relative paths, to avoid open redirects like ?redirect=//evil.com */
function safeRedirect(value: string | null): string {
  if (value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')) {
    return value
  }
  return '/'
}

export default function LoginPage() {
  const { t } = useT()
  const { status, login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirectTo = safeRedirect(params.get('redirect'))

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Store the key (not the text) so the message follows language switches.
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)

  if (status === 'loading') return <LoadingScreen />
  if (status === 'authenticated' && !submitting) return <Navigate to={redirectTo} replace />

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!username.trim() || !password) {
      setErrorKey('login.error.required')
      return
    }
    setSubmitting(true)
    setErrorKey(null)
    try {
      await login(username, password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setErrorKey(
        err instanceof AuthError && err.code === 'required'
          ? 'login.error.required'
          : 'login.error.failed',
      )
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.langCorner}>
        <LanguageToggle />
      </div>

      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <div className={styles.header}>
          <div className={styles.appName}>{t('app.name')}</div>
          <h1 className={styles.title}>{t('login.title')}</h1>
          <p className={styles.subtitle}>{t('login.subtitle')}</p>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>{t('login.username')}</span>
          <input
            className={styles.input}
            type="text"
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={submitting}
            aria-invalid={errorKey !== null}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{t('login.password')}</span>
          <input
            className={styles.input}
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            aria-invalid={errorKey !== null}
          />
        </label>

        <div className={styles.error} role="alert" aria-live="polite">
          {errorKey ? t(errorKey) : null}
        </div>

        <button className={styles.submit} type="submit" disabled={submitting}>
          {submitting ? t('login.submitting') : t('login.submit')}
        </button>
      </form>
    </div>
  )
}
