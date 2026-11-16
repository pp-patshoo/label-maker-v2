/**
 * Auth service: the ONLY file to change when the real backend is ready.
 *
 * ⚠️ MOCK IMPLEMENTATION, DO NOT USE IN PRODUCTION ⚠️
 * Any non-empty username/password is accepted and the "session" lives in sessionStorage.
 * Real implementation (planned): the backend verifies credentials and sets an httpOnly cookie,
 * so the frontend never stores tokens itself:
 *   login           -> POST /api/auth/login   { username, password }   (credentials: 'include')
 *   logout          -> POST /api/auth/logout                           (credentials: 'include')
 *   getCurrentUser  -> GET  /api/auth/me      -> 200 User | 401        (credentials: 'include')
 */

export interface User {
  id: string
  username: string
  displayName: string
}

export class AuthError extends Error {
  readonly code: 'required' | 'failed'
  constructor(code: 'required' | 'failed') {
    super(`auth:${code}`)
    this.code = code
  }
}

const MOCK_STORAGE_KEY = 'mock-auth-user'
const MOCK_DELAY_MS = 300

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function login(username: string, password: string): Promise<User> {
  const name = username.trim()
  if (!name || !password) throw new AuthError('required')

  await delay(MOCK_DELAY_MS)
  // Mock: username "error" simulates a rejected login so the error UI can be tested.
  if (name.toLowerCase() === 'error') throw new AuthError('failed')

  const user: User = { id: `mock-${name}`, username: name, displayName: name }
  try {
    sessionStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(user))
  } catch {
    /* storage unavailable: session lasts until reload */
  }
  return user
}

export async function logout(): Promise<void> {
  await delay(100)
  try {
    sessionStorage.removeItem(MOCK_STORAGE_KEY)
  } catch {
    /* storage unavailable */
  }
}

export async function getCurrentUser(): Promise<User | null> {
  await delay(150)
  try {
    const raw = sessionStorage.getItem(MOCK_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}
