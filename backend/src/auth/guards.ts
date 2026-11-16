import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { Db } from '../db/client.js'
import type { UserRow } from '../db/schema.js'
import { HttpError } from '../errors.js'
import { SESSION_COOKIE, validateSession } from './sessions.js'

export interface RequestAuth {
  sessionId: string
  user: UserRow
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: RequestAuth | null
  }
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Registers hooks on the root instance:
 *  - CSRF defence: state-changing requests must be JSON and (if an Origin header is sent) come from an allowed origin.
 *  - Session loading: resolves the `sid` cookie into `request.auth`.
 */
export function registerAuthHooks(app: FastifyInstance, db: Db, allowedOrigins: string[]): void {
  app.decorateRequest('auth', null)

  app.addHook('onRequest', async (req) => {
    if (!SAFE_METHODS.has(req.method)) {
      const origin = req.headers.origin
      if (origin && !allowedOrigins.includes(origin.replace(/\/$/, ''))) {
        throw new HttpError(403, 'bad_origin')
      }
      const type = req.headers['content-type'] ?? ''
      if (!type.toLowerCase().startsWith('application/json')) {
        throw new HttpError(415, 'unsupported_media_type')
      }
    }

    const token = req.cookies[SESSION_COOKIE]
    req.auth = token ? await validateSession(db, token) : null
  })
}

interface AuthOptions {
  /** Allow users who still have to change their temporary password. */
  allowPasswordChange?: boolean
  role?: 'admin'
}

/** preHandler factory: 401 if not logged in, 403 if password change pending or role missing. */
export function requireAuth(opts: AuthOptions = {}) {
  return async (req: FastifyRequest, _reply: FastifyReply) => {
    const auth = req.auth
    if (!auth) throw new HttpError(401, 'unauthorized')
    if (auth.user.mustChangePassword && !opts.allowPasswordChange) {
      throw new HttpError(403, 'password_change_required')
    }
    if (opts.role && auth.user.role !== opts.role) throw new HttpError(403, 'forbidden')
  }
}

export const requireAdmin = () => requireAuth({ role: 'admin' })

/** Narrow `req.auth` after a requireAuth preHandler. */
export function authOf(req: FastifyRequest): RequestAuth {
  if (!req.auth) throw new HttpError(401, 'unauthorized')
  return req.auth
}
