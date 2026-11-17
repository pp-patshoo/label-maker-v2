import { useState } from 'react'
import { KeyRound, LockOpen, Pencil, Plus, Power, PowerOff, RefreshCw } from 'lucide-react'
import { errorKey } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Badge, BadgeList } from '../../components/Badge'
import DataTable from '../../components/DataTable'
import form from '../../components/Form.module.css'
import IconButton from '../../components/IconButton'
import table from '../../components/Table.module.css'
import Toolbar from '../../components/Toolbar'
import { useApiData } from '../../hooks/useApiData'
import { useDateFormat } from '../../hooks/useDateFormat'
import { useT } from '../../i18n/I18nContext'
import type { TranslationKey } from '../../i18n/en'
import { ConfirmDialog, ResetPasswordDialog, UserFormDialog } from './UserDialogs'
import { listUsers, unlockUser, updateUser } from './usersApi'
import type { AdminUser } from './usersApi'
import styles from './Users.module.css'

type DialogState =
  | { kind: 'create' }
  | { kind: 'edit'; user: AdminUser }
  | { kind: 'reset'; user: AdminUser }
  | { kind: 'deactivate'; user: AdminUser }
  | null

const ROW_ICON = 15

export default function UsersTab() {
  const { t } = useT()
  const { user: me } = useAuth()
  const formatDate = useDateFormat()
  const { data: users, error: loadError, reload } = useApiData(listUsers)
  const [actionError, setActionError] = useState<TranslationKey | null>(null)
  const [dialog, setDialog] = useState<DialogState>(null)

  const closeAndReload = () => {
    setDialog(null)
    reload()
  }

  const runAction = async (fn: () => Promise<unknown>) => {
    try {
      await fn()
      setActionError(null)
      reload()
    } catch (err) {
      setActionError(errorKey(err))
    }
  }

  const refresh = () => {
    setActionError(null)
    reload()
  }

  return (
    <>
      <Toolbar
        error={actionError ?? loadError}
        end={<IconButton label={t('common.refresh')} icon={RefreshCw} onClick={refresh} />}
      >
        <button type="button" className={form.primary} onClick={() => setDialog({ kind: 'create' })}>
          <Plus size={14} strokeWidth={2} className={styles.addIcon} aria-hidden />
          {t('users.add')}
        </button>
      </Toolbar>

      <DataTable
        columns={[
          'users.col.username',
          'users.col.displayName',
          'users.col.role',
          'users.col.status',
          'users.col.lastLogin',
          'users.col.actions',
        ]}
        items={users}
        emptyKey="users.empty"
        rowKey={(u) => u.id}
        renderRow={(u) => {
          const isSelf = u.id === me?.id
          return (
            <>
              <td>
                {u.username}
                {isSelf && <span className={table.muted}> ({t('users.you')})</span>}
              </td>
              <td className={table.ellipsis} title={u.displayName}>
                {u.displayName}
              </td>
              <td>
                <Badge tone={u.role === 'admin' ? 'accent' : 'neutral'}>{t(`role.${u.role}`)}</Badge>
              </td>
              <td>
                <BadgeList>
                  {u.isActive ? (
                    <Badge tone="ok">{t('users.status.active')}</Badge>
                  ) : (
                    <Badge>{t('users.status.inactive')}</Badge>
                  )}
                  {u.lockedUntil && <Badge tone="error">{t('users.status.locked')}</Badge>}
                  {u.mustChangePassword && <Badge tone="warn">{t('users.status.mustChange')}</Badge>}
                </BadgeList>
              </td>
              <td className={table.muted}>{u.lastLoginAt ? formatDate(u.lastLoginAt) : t('users.never')}</td>
              <td>
                <div className={table.actions}>
                  <IconButton
                    label={t('users.action.edit')}
                    icon={Pencil}
                    size={ROW_ICON}
                    onClick={() => setDialog({ kind: 'edit', user: u })}
                  />
                  <IconButton
                    label={t('users.action.resetPassword')}
                    icon={KeyRound}
                    size={ROW_ICON}
                    disabled={isSelf}
                    onClick={() => setDialog({ kind: 'reset', user: u })}
                  />
                  {u.lockedUntil && (
                    <IconButton
                      label={t('users.action.unlock')}
                      icon={LockOpen}
                      size={ROW_ICON}
                      onClick={() => void runAction(() => unlockUser(u.id))}
                    />
                  )}
                  {u.isActive ? (
                    <IconButton
                      label={t('users.action.deactivate')}
                      icon={PowerOff}
                      size={ROW_ICON}
                      disabled={isSelf}
                      onClick={() => setDialog({ kind: 'deactivate', user: u })}
                    />
                  ) : (
                    <IconButton
                      label={t('users.action.activate')}
                      icon={Power}
                      size={ROW_ICON}
                      onClick={() => void runAction(() => updateUser(u.id, { isActive: true }))}
                    />
                  )}
                </div>
              </td>
            </>
          )
        }}
      />

      {dialog?.kind === 'create' && (
        <UserFormDialog user={null} isSelf={false} onClose={() => setDialog(null)} onSaved={closeAndReload} />
      )}
      {dialog?.kind === 'edit' && (
        <UserFormDialog
          user={dialog.user}
          isSelf={dialog.user.id === me?.id}
          onClose={() => setDialog(null)}
          onSaved={closeAndReload}
        />
      )}
      {dialog?.kind === 'reset' && (
        <ResetPasswordDialog user={dialog.user} onClose={() => setDialog(null)} onSaved={closeAndReload} />
      )}
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
