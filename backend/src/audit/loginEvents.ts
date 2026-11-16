import { count, desc, eq } from 'drizzle-orm'
import type { Db } from '../db/client.js'
import { loginEvents, users } from '../db/schema.js'

export type LoginReason = 'ok' | 'invalid' | 'locked' | 'inactive' | 'rate_limited'

export interface LoginEventInput {
  userId: string | null
  usernameAttempted: string
  reason: LoginReason
  ip?: string
  userAgent?: string
}

export async function recordLoginEvent(db: Db, e: LoginEventInput): Promise<void> {
  await db.insert(loginEvents).values({
    userId: e.userId,
    usernameAttempted: e.usernameAttempted.slice(0, 100),
    success: e.reason === 'ok',
    reason: e.reason,
    ip: e.ip ?? null,
    userAgent: e.userAgent?.slice(0, 500) ?? null,
  })
}

export async function listLoginEvents(
  db: Db,
  opts: { limit: number; offset: number; userId?: string },
) {
  const where = opts.userId ? eq(loginEvents.userId, opts.userId) : undefined
  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: loginEvents.id,
        userId: loginEvents.userId,
        usernameAttempted: loginEvents.usernameAttempted,
        displayName: users.displayName,
        success: loginEvents.success,
        reason: loginEvents.reason,
        ip: loginEvents.ip,
        userAgent: loginEvents.userAgent,
        createdAt: loginEvents.createdAt,
      })
      .from(loginEvents)
      .leftJoin(users, eq(loginEvents.userId, users.id))
      .where(where)
      .orderBy(desc(loginEvents.createdAt), desc(loginEvents.id))
      .limit(opts.limit)
      .offset(opts.offset),
    db.select({ total: count() }).from(loginEvents).where(where),
  ])
  return { items, total }
}
