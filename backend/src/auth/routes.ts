import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { recordLoginEvent } from '../audit/loginEvents.js'
import type { Config } from '../config.js'
import type { Db } from '../db/client.js'
import { users } from '../db/schema.js'
import { HttpError, parse } from '../errors.js'
import { authOf, requireAuth } from './guards.js'
import { hashPassword, validatePassword, verifyAgainstDummy, verifyPassword } from './password.js'
import { toPublicUser } from './serialize.js'
import {
  SESSION_ABSOLUTE_MS,
  SESSION_COOKIE,
  createSession,
  revokeSession,
  revokeUserSessions,
} from './sessions.js'

export const MAX_FAILED_ATTEMPTS = 5
export const LOCK_DURATION_MS = 15 * 60 * 1000
const RATE_LIMIT_WINDOW = '15 minutes'

const LoginBody = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(1024),
})

const ChangePasswordBody = z.object({
  currentPassword: z.string().min(1).max(1024),
  newPassword: z.string().min(1).max(1024),
})

const meta = (req: FastifyRequest) => ({ ip: req.ip, userAgent: req.headers['user-agent'] })

export async function authRoutes(app: FastifyInstance, opts: { db: Db; config: Config }) {
  const { db, config } = opts

  const setSessionCookie = (reply: FastifyReply, token: string) =>
    reply.setCookie(SESSION_COOKIE, token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: config.cookieSecure,
      maxAge: Math.floor(SESSION_ABSOLUTE_MS / 1000),
    })

  const clearSessionCookie = (reply: FastifyReply) =>
    reply.clearCookie(SESSION_COOKIE, { path: '/', httpOnly: true, sameSite: 'lax', secure: config.cookieSecure })

  app.post(
    '/auth/login',
    {
      config: {
        rateLimit: {
          max: config.loginRateLimitMax,
          timeWindow: RATE_LIMIT_WINDOW,
          onExceeded: (req: FastifyRequest) => {
            const body = req.body as { username?: unknown } | undefined
            const name = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : ''
            recordLoginEvent(db, { userId: null, usernameAttempted: name, reason: 'rate_limited', ...meta(req) }).catch(
              (err) => req.log.error(err, 'failed to record login event'),
            )
          },
        },
      },
    },
    async (req, reply) => {
      const body = parse(LoginBody, req.body)
      const username = body.username.trim().toLowerCase()
      const event = { usernameAttempted: username, ...meta(req) }

      const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1)
      if (!user) {
        await verifyAgainstDummy(body.password)
        await recordLoginEvent(db, { ...event, userId: null, reason: 'invalid' })
        throw new HttpError(401, 'invalid_credentials')
      }

      const now = Date.now()
      if (user.lockedUntil && user.lockedUntil.getTime() > now) {
        await recordLoginEvent(db, { ...event, userId: user.id, reason: 'locked' })
        throw new HttpError(429, 'too_many_attempts', {
          retryAfter: Math.ceil((user.lockedUntil.getTime() - now) / 1000),
        })
      }

      const ok = await verifyPassword(user.passwordHash, body.password)
      if (!ok) {
        const [updated] = await db
          .update(users)
          .set({ failedAttempts: sql`${users.failedAttempts} + 1` })
          .where(eq(users.id, user.id))
          .returning({ failedAttempts: users.failedAttempts })
        await recordLoginEvent(db, { ...event, userId: user.id, reason: 'invalid' })

        if (updated.failedAttempts >= MAX_FAILED_ATTEMPTS) {
          await db
            .update(users)
            .set({ failedAttempts: 0, lockedUntil: new Date(now + LOCK_DURATION_MS) })
            .where(eq(users.id, user.id))
          throw new HttpError(429, 'too_many_attempts', { retryAfter: Math.ceil(LOCK_DURATION_MS / 1000) })
        }
        throw new HttpError(401, 'invalid_credentials')
      }

      if (!user.isActive) {
        await recordLoginEvent(db, { ...event, userId: user.id, reason: 'inactive' })
        throw new HttpError(401, 'invalid_credentials')
      }

      await db.update(users).set({ failedAttempts: 0, lockedUntil: null }).where(eq(users.id, user.id))
      const { token } = await createSession(db, user.id, meta(req))
      await recordLoginEvent(db, { ...event, userId: user.id, reason: 'ok' })

      setSessionCookie(reply, token)
      return toPublicUser(user)
    },
  )

  app.post('/auth/logout', async (req, reply) => {
    if (req.auth) await revokeSession(db, req.auth.sessionId)
    clearSessionCookie(reply)
    return reply.status(204).send()
  })

  app.get('/auth/me', { preHandler: requireAuth({ allowPasswordChange: true }) }, async (req) => {
    return toPublicUser(authOf(req).user)
  })

  app.post(
    '/auth/change-password',
    { preHandler: requireAuth({ allowPasswordChange: true }) },
    async (req) => {
      const { user, sessionId } = authOf(req)
      const body = parse(ChangePasswordBody, req.body)

      if (!(await verifyPassword(user.passwordHash, body.currentPassword))) {
        throw new HttpError(400, 'invalid_current_password')
      }
      const issue = validatePassword(body.newPassword, user.username)
      if (issue) throw new HttpError(400, issue)
      if (body.newPassword === body.currentPassword) throw new HttpError(400, 'password_same_as_current')

      const now = new Date()
      const [updated] = await db
        .update(users)
        .set({
          passwordHash: await hashPassword(body.newPassword),
          mustChangePassword: false,
          passwordChangedAt: now,
          updatedAt: now,
        })
        .where(eq(users.id, user.id))
        .returning()

      // Sign out every other device; keep the one that made the change.
      await revokeUserSessions(db, user.id, sessionId)
      return toPublicUser(updated)
    },
  )
}
