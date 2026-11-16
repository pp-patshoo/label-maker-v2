import { lazy } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'
import { House, Settings, Tag, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Role } from '../auth/authService'
import type { TranslationKey } from '../i18n/en'

export interface ModuleDef {
  id: string
  path: string
  labelKey: TranslationKey
  icon: LucideIcon
  component: LazyExoticComponent<ComponentType>
  /** 'bottom' pins the item to the bottom of the sidebar (e.g. Settings). */
  position?: 'top' | 'bottom'
  /** Only users with this role see the menu item and can open the page. */
  requiredRole?: Role
}

/**
 * The single place to register modules.
 * To add a module: create a folder in src/modules/, add one entry here,
 * and add its label key to src/i18n/en.ts and th.ts.
 */
export const modules: ModuleDef[] = [
  {
    id: 'home',
    path: '/',
    labelKey: 'menu.home',
    icon: House,
    component: lazy(() => import('./home/HomePage')),
  },
  {
    id: 'sample',
    path: '/sample',
    labelKey: 'menu.sample',
    icon: Tag,
    component: lazy(() => import('./sample/SamplePage')),
  },
  {
    id: 'users',
    path: '/users',
    labelKey: 'menu.users',
    icon: Users,
    component: lazy(() => import('./users/UsersPage')),
    position: 'bottom',
    requiredRole: 'admin',
  },
  {
    id: 'settings',
    path: '/settings',
    labelKey: 'menu.settings',
    icon: Settings,
    component: lazy(() => import('./settings/SettingsPage')),
    position: 'bottom',
  },
]

/** Modules the given role may see. */
export function modulesFor(role: Role | undefined): ModuleDef[] {
  return modules.filter((m) => !m.requiredRole || m.requiredRole === role)
}
