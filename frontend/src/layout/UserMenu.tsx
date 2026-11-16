import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleUser, LogOut } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useT } from '../i18n/I18nContext'
import styles from './UserMenu.module.css'

/** Account button at the bottom of the sidebar (like VS Code's Accounts). */
export default function UserMenu({ collapsed }: { collapsed: boolean }) {
  const { t } = useT()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!user) return null

  const handleSignOut = async () => {
    setOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className={styles.root} ref={rootRef} data-collapsed={collapsed}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={collapsed ? user.displayName : t('user.menu')}
        aria-label={collapsed ? `${t('user.menu')}: ${user.displayName}` : undefined}
      >
        <CircleUser size={20} strokeWidth={1.5} className={styles.icon} aria-hidden />
        {!collapsed && <span className={styles.name}>{user.displayName}</span>}
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          <div className={styles.menuHeader}>{user.displayName}</div>
          <button type="button" role="menuitem" className={styles.menuItem} onClick={handleSignOut}>
            <LogOut size={16} strokeWidth={1.5} aria-hidden />
            <span>{t('user.signOut')}</span>
          </button>
        </div>
      )}
    </div>
  )
}
