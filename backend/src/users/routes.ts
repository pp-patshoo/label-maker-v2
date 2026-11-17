import type { FastifyInstance } from 'fastify'
import { asc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { listLoginEvents } from '../audit/loginEvents.js'
import { authOf, requireAdmin } from '../auth/guards.js'
import { hashPassword, validatePassword } from '../auth/password.js'
import { revokeUserSessions } from '../auth/sessions.js'
import type { Db } from '../db/client.js'
import { users } from '../db/schema.js'
import type { UserRow } from '../db/schema.js'
import { HttpError, parse } from '../errors.js'
import { setTemporaryPassword } from './passwordReset.js'

const USERNAME_RE = /^[a-z0-9._-]{3,32}$/

const Username = z
  .string()
  .transform((s) => s.trim().toLowerCase())
  .pipe(z.string().regex(USERNAME_RE))
const DisplayName = z.string().trim().min(1).max(100)
const Role = z.enum(['admin', 'user'])
const Password = z.string().min(1).max(1024)

const CreateBody = z.object({ username: Username, displayName: DisplayName, role: Role, tempPassword: Password })
const UpdateBody = z
  .object({ displayName: DisplayName.optional(), role: Role.optional(), isActive: z.boolean().optional() })
  .refine((b) => Object.keys(b).length > 0)
const ResetBody = z.object({ tempPassword: Password })
const IdParams = z.object({ id: z.string().uuid() })
const EventsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  userId: z.string().uuid().optional(),
})

/** Admin view of a user (never includes the hash). */
function toAdminUser(u: UserRow, lastLoginAt: Date | null = null) {
  const locked = u.lockedUntil !== null && u.lockedUntil.getTime() > Date.now()
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    role: u.role,
    isActive: u.isActive,
    mustChangePassword: u.mustChangePassword,
    lockedUntil: locked ? u.lockedUntil : null,
    lastLoginAt,
    createdAt: u.createdAt,
  }
}

function parseId(params: unknown): string {
  const r = IdParams.safeParse(params)
  if (!r.success) throw new HttpError(404, 'not_found')
  return r.data.id
}

const isUniqueViolation = (err: unknown) =>
  typeof err === 'object' && err !== null &&
  ((err as { code?: string }).code === '23505' || (err as { cause?: { code?: string } }).cause?.code === '23505')

export async function userRoutes(app: FastifyInstance, opts: { db: Db }) {
  const { db } = opts
  app.addHook('preHandler', requireAdmin())

  // Written with explicit table-qualified names: inside a select, Drizzle drops the table prefix from
  // interpolated columns, which would make "user_id" = "id" resolve against login_events.
  const lastLogin = sql<Date | null>`(
    select max(le.created_at) from login_events le
    where le.user_id = "users"."id" and le.success
  )`.mapWith((v: string | Date | null) => (v ? new Date(v) : null))

  app.get('/users', async () => {
    const rows = await db.select({ user: users, lastLoginAt: lastLogin }).from(users).orderBy(asc(users.username))
    return rows.map((r) => toAdminUser(r.user, r.lastLoginAt))
  })

  app.post('/users', async (req, reply) => {
    const body = parse(CreateBody, req.body)
    const issue = validatePassword(body.tempPassword, body.username)
    if (issue) throw new HttpError(400, issue)

    try {
      const [created] = await db
        .insert(users)
        .values({
          username: body.username,
          displayName: body.displayName,
          role: body.role,
          passwordHash: await hashPassword(body.tempPassword),
          mustChangePassword: true,
        })
        .returning()
      return reply.status(201).send(toAdminUser(created))
    } catch (err) {
      if (isUniqueViolation(err)) throw new HttpError(409, 'username_taken')
      throw err
    }
  })

  app.patch('/users/:id', async (req) => {
    const id = parseId(req.params)
    const body = parse(UpdateBody, req.body)
    const me = authOf(req).user

    if (id === me.id && (body.role === 'user' || body.isActive === false)) {
      throw new HttpError(400, 'cannot_modify_self')
    }

    const [updated] = await db
      .update(users)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning()
    if (!updated) throw new HttpError(404, 'not_found')

    if (body.isActive === false) await revokeUserSessions(db, id)
    return toAdminUser(updated)
  })

  app.post('/users/:id/reset-password', async (req) => {
    const id = parseId(req.params)
    const body = parse(ResetBody, req.body)
    if (id === authOf(req).user.id) throw new HttpError(400, 'cannot_modify_self')

    const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1)
    if (!target) throw new HttpError(404, 'not_found')
    const issue = validatePassword(body.tempPassword, target.username)
    if (issue) throw new HttpError(400, issue)

    const updated = await setTemporaryPassword(db, id, body.tempPassword)
    if (!updated) throw new HttpError(404, 'not_found')
    return toAdminUser(updated)
  })

  app.post('/users/:id/unlock', async (req) => {
    const id = parseId(req.params)
    const [updated] = await db
      .update(users)
      .set({ failedAttempts: 0, lockedUntil: null, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning()
    if (!updated) throw new HttpError(404, 'not_found')
    return toAdminUser(updated)
  })

  app.get('/login-events', async (req) => {
    const q = parse(EventsQuery, req.query)
    return listLoginEvents(db, q)
  })
}
