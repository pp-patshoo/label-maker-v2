import { lazy } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'
import { House, Settings, Tag } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TranslationKey } from '../i18n/en'

export interface ModuleDef {
  id: string
  path: string
  labelKey: TranslationKey
  icon: LucideIcon
  component: LazyExoticComponent<ComponentType>
  /** 'bottom' pins the item to the bottom of the sidebar (e.g. Settings). */
  position?: 'top' | 'bottom'
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
    id: 'settings',
    path: '/settings',
    labelKey: 'menu.settings',
    icon: Settings,
    component: lazy(() => import('./settings/SettingsPage')),
    position: 'bottom',
  },
]
