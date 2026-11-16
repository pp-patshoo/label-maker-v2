import { useState } from 'react'
import type { FormEvent } from 'react'
import { errorKey } from '../api/client'
import form from '../components/Form.module.css'
import { useT } from '../i18n/I18nContext'
import type { TranslationKey } from '../i18n/en'
import { useAuth } from './AuthContext'
import { PASSWORD_MIN_LENGTH, checkPassword } from './passwordPolicy'

interface ChangePasswordFormProps {
  /** Called after a successful change. */
  onChanged?: () => void
  /** Show a success message in the form itself (settings page). */
  showSuccess?: boolean
  fullWidthButton?: boolean
}

export default function ChangePasswordForm({ onChanged, showSuccess = false, fullWidthButton = false }: ChangePasswordFormProps) {
  const { t } = useT()
  const { user, changePassword } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorKeyState, setErrorKey] = useState<TranslationKey | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setDone(false)
    if (!current || !next || !confirm) return setErrorKey('error.required')
    const issue = checkPassword(next, user?.username ?? '')
    if (issue) return setErrorKey(`error.${issue}` as TranslationKey)
    if (next !== confirm) return setErrorKey('error.password_mismatch')
    if (next === current) return setErrorKey('error.password_same_as_current')

    setSubmitting(true)
    setErrorKey(null)
    try {
      await changePassword(current, next)
      setCurrent('')
      setNext('')
      setConfirm('')
      setDone(true)
      onChanged?.()
    } catch (err) {
      setErrorKey(errorKey(err))
    } finally {
      setSubmitting(false)
    }
  }

  const invalid = errorKeyState !== null

  return (
    <form className={form.form} onSubmit={handleSubmit} noValidate>
      {/* Helps password managers associate the new password with the account */}
      <input type="text" name="username" autoComplete="username" value={user?.username ?? ''} readOnly hidden />

      <label className={form.field}>
        <span className={form.label}>{t('password.current')}</span>
        <input
          className={form.input}
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          disabled={submitting}
          aria-invalid={invalid}
        />
      </label>

      <label className={form.field}>
        <span className={form.label}>{t('password.new')}</span>
        <input
          className={form.input}
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          disabled={submitting}
          aria-invalid={invalid}
          aria-describedby="password-hint"
        />
        <span id="password-hint" className={form.hint}>
          {t('password.hint', { min: PASSWORD_MIN_LENGTH })}
        </span>
      </label>

      <label className={form.field}>
        <span className={form.label}>{t('password.confirm')}</span>
        <input
          className={form.input}
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={submitting}
          aria-invalid={invalid}
        />
      </label>

      <div className={done && showSuccess ? form.success : form.error} role="alert" aria-live="polite">
        {errorKeyState ? t(errorKeyState) : done && showSuccess ? t('password.changed') : null}
      </div>

      <button
        className={`${form.primary} ${fullWidthButton ? form.full : ''}`}
        type="submit"
        disabled={submitting}
      >
        {submitting ? t('common.saving') : t('password.submit')}
      </button>
    </form>
  )
}
