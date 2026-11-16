import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import LoadingScreen from '../components/LoadingScreen'
import { useAuth } from './AuthContext'
import type { Role } from './authService'

interface RequireAuthProps {
  children: ReactNode
  /** Only users with this role may see the page; others are sent home. */
  requiredRole?: Role
  /** Let users with a temporary password through (used by the change-password page itself). */
  allowPasswordChange?: boolean
}

/**
 * Route guard:
 *  - not signed in        -> /login?redirect=<original path>
 *  - temporary password   -> /change-password
 *  - missing role         -> /
 */
export default function RequireAuth({ children, requiredRole, allowPasswordChange = false }: RequireAuthProps) {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <LoadingScreen />
  if (status === 'unauthenticated' || !user) {
    const target = location.pathname + location.search
    const query = target === '/' ? '' : `?redirect=${encodeURIComponent(target)}`
    return <Navigate to={`/login${query}`} replace />
  }
  if (user.mustChangePassword && !allowPasswordChange) return <Navigate to="/change-password" replace />
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/" replace />
  return <>{children}</>
}
