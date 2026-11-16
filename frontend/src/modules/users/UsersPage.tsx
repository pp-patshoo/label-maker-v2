import { useState } from 'react'
import PageTemplate from '../../components/PageTemplate'
import { useT } from '../../i18n/I18nContext'
import LoginHistoryTab from './LoginHistoryTab'
import UsersTab from './UsersTab'
import styles from './Users.module.css'

type Tab = 'users' | 'history'

/** Admin-only module (see requiredRole in modules/registry.ts). */
export default function UsersPage() {
  const { t } = useT()
  const [tab, setTab] = useState<Tab>('users')

  return (
    <PageTemplate titleKey="menu.users">
      <div className={styles.wrap}>
        <div className={styles.tabs} role="tablist">
          {(['users', 'history'] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              className={styles.tab}
              aria-selected={tab === id}
              onClick={() => setTab(id)}
            >
              {t(id === 'users' ? 'users.tab.users' : 'users.tab.history')}
            </button>
          ))}
        </div>
        <div role="tabpanel" className={styles.wrap}>
          {tab === 'users' ? <UsersTab /> : <LoginHistoryTab />}
        </div>
      </div>
    </PageTemplate>
  )
}
