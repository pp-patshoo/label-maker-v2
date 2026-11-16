import { apiFetch } from '../../api/client'
import type { Role } from '../../auth/authService'

export interface AdminUser {
  id: string
  username: string
  displayName: string
  role: Role
  isActive: boolean
  mustChangePassword: boolean
  lockedUntil: string | null
  lastLoginAt: string | null
  createdAt: string
}

export type LoginReason = 'ok' | 'invalid' | 'locked' | 'inactive' | 'rate_limited'

export interface LoginEvent {
  id: number
  userId: string | null
  usernameAttempted: string
  displayName: string | null
  success: boolean
  reason: LoginReason
  ip: string | null
  userAgent: string | null
  createdAt: string
}

export const listUsers = () => apiFetch<AdminUser[]>('/users')

export const createUser = (body: { username: string; displayName: string; role: Role; tempPassword: string }) =>
  apiFetch<AdminUser>('/users', { method: 'POST', body })

export const updateUser = (id: string, body: { displayName?: string; role?: Role; isActive?: boolean }) =>
  apiFetch<AdminUser>(`/users/${id}`, { method: 'PATCH', body })

export const resetPassword = (id: string, tempPassword: string) =>
  apiFetch<AdminUser>(`/users/${id}/reset-password`, { method: 'POST', body: { tempPassword } })

export const unlockUser = (id: string) => apiFetch<AdminUser>(`/users/${id}/unlock`, { method: 'POST' })

export const listLoginEvents = (limit: number, offset: number) =>
  apiFetch<{ items: LoginEvent[]; total: number }>(`/login-events?limit=${limit}&offset=${offset}`)
