import { Suspense, useState } from 'react'
import { Outlet } from 'react-router-dom'
import LoadingScreen from '../components/LoadingScreen'
import Sidebar from './Sidebar'
import styles from './AppLayout.module.css'

const COLLAPSE_KEY = 'sidebar-collapsed'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

/** Two-part layout: sidebar on the left, the selected module on the right. */
export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(readCollapsed)

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      } catch {
        /* storage unavailable */
      }
      return next
    })
  }

  return (
    <div className={styles.layout} data-collapsed={collapsed}>
      <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      <main className={styles.content}>
        <Suspense fallback={<LoadingScreen />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
