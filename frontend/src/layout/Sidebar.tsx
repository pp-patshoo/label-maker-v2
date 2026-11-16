import { NavLink } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import LanguageToggle from '../components/LanguageToggle'
import { useT } from '../i18n/I18nContext'
import { useAuth } from '../auth/AuthContext'
import { modulesFor } from '../modules/registry'
import type { ModuleDef } from '../modules/registry'
import UserMenu from './UserMenu'
import styles from './Sidebar.module.css'

interface SidebarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
}

export default function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const { t } = useT()
  const { user } = useAuth()
  const visible = modulesFor(user?.role)
  const topModules = visible.filter((m) => m.position !== 'bottom')
  const bottomModules = visible.filter((m) => m.position === 'bottom')
  const toggleLabel = collapsed ? t('sidebar.expand') : t('sidebar.collapse')
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose

  const renderItem = (m: ModuleDef) => {
    const Icon = m.icon
    const label = t(m.labelKey)
    return (
      <li key={m.id}>
        <NavLink
          to={m.path}
          end={m.path === '/'}
          className={({ isActive }) => (isActive ? `${styles.item} ${styles.active}` : styles.item)}
          title={collapsed ? label : undefined}
          aria-label={collapsed ? label : undefined}
        >
          <Icon size={20} strokeWidth={1.5} className={styles.icon} aria-hidden />
          {!collapsed && <span className={styles.label}>{label}</span>}
        </NavLink>
      </li>
    )
  }

  return (
    <aside className={styles.sidebar} data-collapsed={collapsed}>
      <div className={styles.header}>
        {!collapsed && <span className={styles.appName}>{t('app.name')}</span>}
        <button
          type="button"
          className={styles.iconButton}
          onClick={onToggleCollapsed}
          title={toggleLabel}
          aria-label={toggleLabel}
          aria-expanded={!collapsed}
        >
          <ToggleIcon size={18} strokeWidth={1.5} aria-hidden />
        </button>
      </div>

      <nav className={styles.nav}>
        <ul className={styles.list}>{topModules.map(renderItem)}</ul>
        <ul className={styles.list}>{bottomModules.map(renderItem)}</ul>
      </nav>

      <div className={styles.footer}>
        <div className={styles.lang}>
          <LanguageToggle compact={collapsed} />
        </div>
        <UserMenu collapsed={collapsed} />
      </div>
    </aside>
  )
}
