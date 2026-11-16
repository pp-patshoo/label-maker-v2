import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as authService from './authService'
import type { User } from './authService'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthValue {
  user: User | null
  status: AuthStatus
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

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

  const login = useCallback(async (username: string, password: string) => {
    const u = await authService.login(username, password)
    setUser(u)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  const value = useMemo(() => ({ user, status, login, logout }), [user, status, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
