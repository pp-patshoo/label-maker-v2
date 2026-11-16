import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { setUnauthorizedHandler } from '../api/client'
import * as authService from './authService'
import type { User } from './authService'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthValue {
  user: User | null
  status: AuthStatus
  /** True after the backend rejected our session mid-use (expired or revoked). */
  sessionExpired: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(() => {
    let cancelled = false
    authService
      .getCurrentUser()
      .catch(() => null)
      .then((u) => {
        if (cancelled) return
        setUser(u)
        setStatus(u ? 'authenticated' : 'unauthenticated')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Any API call that gets 401 while signed in means the session is gone: drop back to the login page.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      setStatus('unauthenticated')
      setSessionExpired(true)
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const u = await authService.login(username, password)
    setSessionExpired(false)
    setUser(u)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      setUser(null)
      setStatus('unauthenticated')
      setSessionExpired(false)
    }
  }, [])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const u = await authService.changePassword(currentPassword, newPassword)
    setUser(u)
  }, [])

  const value = useMemo(
    () => ({ user, status, sessionExpired, login, logout, changePassword }),
    [user, status, sessionExpired, login, logout, changePassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
