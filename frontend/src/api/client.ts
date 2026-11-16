import type { TranslationKey } from '../i18n/en'
import { en } from '../i18n/en'

/** Error from the backend (`{ error: code }`) or a network failure (`code: 'network'`). */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly retryAfter?: number

  constructor(status: number, code: string, retryAfter?: number) {
    super(code)
    this.status = status
    this.code = code
    this.retryAfter = retryAfter
  }
}

type Handler = () => void
let unauthorizedHandler: Handler | null = null

/** Called when a request fails with 401 while the app thinks the user is signed in (session expired/revoked). */
export function setUnauthorizedHandler(handler: Handler | null): void {
  unauthorizedHandler = handler
}

interface Options {
  method?: 'GET' | 'POST' | 'PATCH'
  body?: unknown
  /** Don't trigger the global "session expired" handler on 401 (login, /me). */
  skipUnauthorizedHandler?: boolean
}

export async function apiFetch<T>(path: string, opts: Options = {}): Promise<T> {
  const method = opts.method ?? 'GET'
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'include',
      headers: method === 'GET' ? { Accept: 'application/json' } : { 'Content-Type': 'application/json' },
      // Every state-changing request carries a JSON body: the backend rejects anything else (CSRF defence).
      body: method === 'GET' ? undefined : JSON.stringify(opts.body ?? {}),
    })
  } catch {
    throw new ApiError(0, 'network')
  }

  if (res.status === 204) return undefined as T
  const data: unknown = await res.json().catch(() => null)

  if (!res.ok) {
    const body = (data ?? {}) as { error?: string; retryAfter?: number }
    const code = body.error ?? (res.status >= 500 ? 'unknown' : 'invalid_request')
    if (res.status === 401 && !opts.skipUnauthorizedHandler) unauthorizedHandler?.()
    throw new ApiError(res.status, code, body.retryAfter)
  }
  return data as T
}

/** Translation key for any error thrown by apiFetch (or anything else). */
export function errorKey(err: unknown): TranslationKey {
  const code = err instanceof ApiError ? err.code : 'unknown'
  const key = `error.${code}`
  return key in en ? (key as TranslationKey) : 'error.unknown'
}

/** Vars for messages that need them (e.g. minutes to wait). */
export function errorVars(err: unknown): Record<string, number> | undefined {
  if (err instanceof ApiError && err.retryAfter) return { minutes: Math.max(1, Math.ceil(err.retryAfter / 60)) }
  return undefined
}
