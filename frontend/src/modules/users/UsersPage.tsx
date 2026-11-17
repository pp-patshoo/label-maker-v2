import { useState } from 'react'
import PageTemplate from '../../components/PageTemplate'
import Tabs from '../../components/Tabs'
import type { TabItem } from '../../components/Tabs'
import LoginHistoryTab from './LoginHistoryTab'
import UsersTab from './UsersTab'
import styles from './Users.module.css'

type Tab = 'users' | 'history'

const TABS: TabItem<Tab>[] = [
  { id: 'users', labelKey: 'users.tab.users' },
  { id: 'history', labelKey: 'users.tab.history' },
]

/** Admin-only module (see requiredRole in modules/registry.ts). */
export default function UsersPage() {
  const [tab, setTab] = useState<Tab>('users')

  return (
    <PageTemplate titleKey="menu.users">
      <div className={styles.wrap}>
        <Tabs items={TABS} value={tab} onChange={setTab} />
        <div role="tabpanel" className={styles.wrap}>
          {tab === 'users' ? <UsersTab /> : <LoginHistoryTab />}
        </div>
      </div>
    </PageTemplate>
  )
}
