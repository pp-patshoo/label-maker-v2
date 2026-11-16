/**
 * Auth API (backend: /api/auth/*). The session lives in an httpOnly cookie set by the backend,
 * so the frontend never sees or stores a token.
 */
import { ApiError, apiFetch } from '../api/client'

export type Role = 'admin' | 'user'

export interface User {
  id: string
  username: string
  displayName: string
  role: Role
  /** True while the user still has a temporary password set by an admin. */
  mustChangePassword: boolean
}

export function login(username: string, password: string): Promise<User> {
  return apiFetch<User>('/auth/login', {
    method: 'POST',
    body: { username, password },
    skipUnauthorizedHandler: true,
  })
}

export function logout(): Promise<void> {
  return apiFetch<void>('/auth/logout', { method: 'POST', skipUnauthorizedHandler: true })
}

/** The signed-in user, or null when there is no valid session. */
export async function getCurrentUser(): Promise<User | null> {
  try {
    return await apiFetch<User>('/auth/me', { skipUnauthorizedHandler: true })
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null
    throw err
  }
}

export function changePassword(currentPassword: string, newPassword: string): Promise<User> {
  return apiFetch<User>('/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  })
}
