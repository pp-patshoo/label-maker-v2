import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { KeyRound, LockOpen, Pencil, Plus, Power, PowerOff, RefreshCw } from 'lucide-react'
import { errorKey } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import form from '../../components/Form.module.css'
import { useT } from '../../i18n/I18nContext'
import type { TranslationKey } from '../../i18n/en'
import { ConfirmDialog, ResetPasswordDialog, UserFormDialog } from './UserDialogs'
import { listUsers, unlockUser, updateUser } from './usersApi'
import type { AdminUser } from './usersApi'
import { useDateFormat } from './useDateFormat'
import styles from './Users.module.css'

type DialogState =
  | { kind: 'create' }
  | { kind: 'edit'; user: AdminUser }
  | { kind: 'reset'; user: AdminUser }
  | { kind: 'deactivate'; user: AdminUser }
  | null

export default function UsersTab() {
  const { t } = useT()
  const { user: me } = useAuth()
  const formatDate = useDateFormat()
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [error, setError] = useState<TranslationKey | null>(null)
  const [dialog, setDialog] = useState<DialogState>(null)

  const load = useCallback(async () => {
    try {
      setUsers(await listUsers())
      setError(null)
    } catch (err) {
      setError(errorKey(err))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const closeAndReload = () => {
    setDialog(null)
    void load()
  }

  const runAction = async (fn: () => Promise<unknown>) => {
    try {
      await fn()
      await load()
    } catch (err) {
      setError(errorKey(err))
    }
  }

  const iconBtn = (label: string, icon: ReactNode,onClick: () => void, disabled = false) => (
    <button type="button" className={styles.iconButton} title={label} aria-label={label} onClick={onClick} disabled={disabled}>
      {icon}
    </button>
  )

  return (
    <>
      <div className={styles.toolbar}>
        <button type="button" className={form.primary} onClick={() => setDialog({ kind: 'create' })}>
          <Plus size={14} strokeWidth={2} style={{ verticalAlign: '-2px', marginRight: 6 }} aria-hidden />
          {t('users.add')}
        </button>
        <div className={styles.toolbarRight}>
          {error && <span className={styles.banner}>{t(error)}</span>}
          {iconBtn(t('common.refresh'), <RefreshCw size={16} strokeWidth={1.5} />, () => void load())}
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('users.col.username')}</th>
              <th>{t('users.col.displayName')}</th>
              <th>{t('users.col.role')}</th>
              <th>{t('users.col.status')}</th>
              <th>{t('users.col.lastLogin')}</th>
              <th>{t('users.col.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {users === null ? (
              <tr>
                <td colSpan={6} className={styles.emptyRow}>
                  {t('page.loading')}
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyRow}>
                  {t('users.empty')}
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isSelf = u.id === me?.id
                return (
                  <tr key={u.id}>
                    <td>
                      {u.username}
                      {isSelf && <span className={styles.muted}> ({t('users.you')})</span>}
                    </td>
                    <td className={styles.ellipsis} title={u.displayName}>
                      {u.displayName}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${u.role === 'admin' ? styles.badgeAdmin : ''}`}>
                        {t(`role.${u.role}`)}
                      </span>
                    </td>
                    <td>
                      <div className={styles.badges}>
                        {u.isActive ? (
                          <span className={`${styles.badge} ${styles.badgeOk}`}>{t('users.status.active')}</span>
                        ) : (
                          <span className={styles.badge}>{t('users.status.inactive')}</span>
                        )}
                        {u.lockedUntil && (
                          <span className={`${styles.badge} ${styles.badgeError}`}>{t('users.status.locked')}</span>
                        )}
                        {u.mustChangePassword && (
                          <span className={`${styles.badge} ${styles.badgeWarn}`}>{t('users.status.mustChange')}</span>
                        )}
                      </div>
                    </td>
                    <td className={styles.muted}>{u.lastLoginAt ? formatDate(u.lastLoginAt) : t('users.never')}</td>
                    <td>
                      <div className={styles.actions}>
                        {iconBtn(t('users.action.edit'), <Pencil size={15} strokeWidth={1.5} />, () =>
                          setDialog({ kind: 'edit', user: u }),
                        )}
                        {iconBtn(
                          t('users.action.resetPassword'),
                          <KeyRound size={15} strokeWidth={1.5} />,
                          () => setDialog({ kind: 'reset', user: u }),
                          isSelf,
                        )}
                        {u.lockedUntil &&
                          iconBtn(t('users.action.unlock'), <LockOpen size={15} strokeWidth={1.5} />, () =>
                            void runAction(() => unlockUser(u.id)),
                          )}
                        {u.isActive
                          ? iconBtn(
                              t('users.action.deactivate'),
                              <PowerOff size={15} strokeWidth={1.5} />,
                              () => setDialog({ kind: 'deactivate', user: u }),
                              isSelf,
                            )
                          : iconBtn(t('users.action.activate'), <Power size={15} strokeWidth={1.5} />, () =>
                              void runAction(() => updateUser(u.id, { isActive: true })),
                            )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {dialog?.kind === 'create' && <UserFormDialog user={null} isSelf={false} onClose={() => setDialog(null)} onSaved={closeAndReload} />}
      {dialog?.kind === 'edit' && (
        <UserFormDialog user={dialog.user} isSelf={dialog.user.id === me?.id} onClose={() => setDialog(null)} onSaved={closeAndReload} />
      )}
      {dialog?.kind === 'reset' && <ResetPasswordDialog user={dialog.user} onClose={() => setDialog(null)} onSaved={closeAndReload} />}
      {dialog?.kind === 'deactivate' && (
        <ConfirmDialog
          message={t('users.confirm.deactivate', { name: dialog.user.displayName })}
          confirmLabel={t('users.action.deactivate')}
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            await updateUser(dialog.user.id, { isActive: false })
            closeAndReload()
          }}
        />
      )}
    </>
  )
}
