import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import LoadingScreen from '../components/LoadingScreen'
import { useAuth } from './AuthContext'

/** Route guard: unauthenticated users are sent to /login?redirect=<original path>. */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <LoadingScreen />
  if (status === 'unauthenticated') {
    const target = location.pathname + location.search
    const query = target === '/' ? '' : `?redirect=${encodeURIComponent(target)}`
    return <Navigate to={`/login${query}`} replace />
  }
  return <>{children}</>
}
