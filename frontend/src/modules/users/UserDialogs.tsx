import { useState } from 'react'
import type { FormEvent } from 'react'
import { errorKey } from '../../api/client'
import type { Role } from '../../auth/authService'
import { checkPassword, generateTempPassword } from '../../auth/passwordPolicy'
import Dialog from '../../components/Dialog'
import form from '../../components/Form.module.css'
import { useT } from '../../i18n/I18nContext'
import type { TranslationKey } from '../../i18n/en'
import { createUser, resetPassword, updateUser } from './usersApi'
import type { AdminUser } from './usersApi'

const USERNAME_RE = /^[a-z0-9._-]{3,32}$/

interface FormState {
  submitting: boolean
  error: TranslationKey | null
}

function useSubmit() {
  const [state, setState] = useState<FormState>({ submitting: false, error: null })
  const run = async (fn: () => Promise<void>) => {
    setState({ submitting: true, error: null })
    try {
      await fn()
      setState({ submitting: false, error: null })
    } catch (err) {
      setState({ submitting: false, error: errorKey(err) })
    }
  }
  const fail = (error: TranslationKey) => setState({ submitting: false, error })
  return { ...state, run, fail }
}

function TempPasswordField({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  const { t } = useT()
  return (
    <label className={form.field}>
      <span className={form.label}>{t('users.field.tempPassword')}</span>
      <div className={form.inputRow}>
        <input
          className={`${form.input} ${form.mono}`}
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
        <button type="button" className={form.button} onClick={() => onChange(generateTempPassword())} disabled={disabled}>
          {t('common.generate')}
        </button>
      </div>
      <span className={form.hint}>{t('users.field.tempPasswordHint')}</span>
    </label>
  )
}

function Actions({ submitting, onCancel }: { submitting: boolean; onCancel: () => void }) {
  const { t } = useT()
  return (
    <div className={form.actions}>
      <button type="button" className={form.button} onClick={onCancel} disabled={submitting}>
        {t('common.cancel')}
      </button>
      <button type="submit" className={form.primary} disabled={submitting}>
        {submitting ? t('common.saving') : t('common.save')}
      </button>
    </div>
  )
}

/* ---------- Create / edit ---------- */

interface UserFormDialogProps {
  /** null = create a new user */
  user: AdminUser | null
  isSelf: boolean
  onClose: () => void
  onSaved: () => void
}

export function UserFormDialog({ user, isSelf, onClose, onSaved }: UserFormDialogProps) {
  const { t } = useT()
  const isEdit = user !== null
  const [username, setUsername] = useState(user?.username ?? '')
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [role, setRole] = useState<Role>(user?.role ?? 'user')
  const [tempPassword, setTempPassword] = useState(() => (isEdit ? '' : generateTempPassword()))
  const { submitting, error, run, fail } = useSubmit()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const name = username.trim().toLowerCase()
    if (!displayName.trim() || (!isEdit && (!name || !tempPassword))) return fail('error.required')
    if (!isEdit) {
      if (!USERNAME_RE.test(name)) return fail('error.invalid_request')
      const issue = checkPassword(tempPassword, name)
      if (issue) return fail(`error.${issue}` as TranslationKey)
    }
    void run(async () => {
      if (isEdit) await updateUser(user.id, { displayName: displayName.trim(), role })
      else await createUser({ username: name, displayName: displayName.trim(), role, tempPassword })
      onSaved()
    })
  }

  return (
    <Dialog open title={t(isEdit ? 'users.dialog.edit' : 'users.dialog.create')} onClose={onClose}>
      <form className={form.form} onSubmit={submit} noValidate>
        <label className={form.field}>
          <span className={form.label}>{t('users.field.username')}</span>
          <input
            className={form.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isEdit || submitting}
            autoComplete="off"
            spellCheck={false}
            autoFocus={!isEdit}
          />
          {!isEdit && <span className={form.hint}>{t('users.field.usernameHint')}</span>}
        </label>

        <label className={form.field}>
          <span className={form.label}>{t('users.field.displayName')}</span>
          <input
            className={form.input}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={submitting}
            maxLength={100}
            autoFocus={isEdit}
          />
        </label>

        <label className={form.field}>
          <span className={form.label}>{t('users.field.role')}</span>
          <select
            className={form.select}
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            disabled={submitting || isSelf}
          >
            <option value="user">{t('role.user')}</option>
            <option value="admin">{t('role.admin')}</option>
          </select>
        </label>

        {!isEdit && <TempPasswordField value={tempPassword} onChange={setTempPassword} disabled={submitting} />}

        <div className={form.error} role="alert">
          {error ? t(error) : null}
        </div>
        <Actions submitting={submitting} onCancel={onClose} />
      </form>
    </Dialog>
  )
}

/* ---------- Reset password ---------- */

export function ResetPasswordDialog({ user, onClose, onSaved }: { user: AdminUser; onClose: () => void; onSaved: () => void }) {
  const { t } = useT()
  const [tempPassword, setTempPassword] = useState(generateTempPassword)
  const { submitting, error, run, fail } = useSubmit()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const issue = checkPassword(tempPassword, user.username)
    if (issue) return fail(`error.${issue}` as TranslationKey)
    void run(async () => {
      await resetPassword(user.id, tempPassword)
      onSaved()
    })
  }

  return (
    <Dialog open title={t('users.dialog.reset', { name: user.displayName })} onClose={onClose}>
      <form className={form.form} onSubmit={submit} noValidate>
        <TempPasswordField value={tempPassword} onChange={setTempPassword} disabled={submitting} />
        <div className={form.error} role="alert">
          {error ? t(error) : null}
        </div>
        <Actions submitting={submitting} onCancel={onClose} />
      </form>
    </Dialog>
  )
}

/* ---------- Confirm ---------- */

export function ConfirmDialog({
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  message: string
  confirmLabel: string
  onConfirm: () => Promise<void>
  onClose: () => void
}) {
  const { t } = useT()
  const { submitting, error, run } = useSubmit()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void run(onConfirm)
  }

  return (
    <Dialog open title={t('users.confirm.title')} onClose={onClose}>
      <form className={form.form} onSubmit={submit}>
        <p>{message}</p>
        <div className={form.error} role="alert">
          {error ? t(error) : null}
        </div>
        <div className={form.actions}>
          <button type="button" className={form.button} onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </button>
          <button type="submit" className={form.primary} disabled={submitting} autoFocus>
            {confirmLabel}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
