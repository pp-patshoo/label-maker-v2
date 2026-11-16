import { createHash, randomBytes } from 'node:crypto'
import { and, eq, lt, ne, or, sql } from 'drizzle-orm'
import type { Db } from '../db/client.js'
import { sessions, users } from '../db/schema.js'
import type { UserRow } from '../db/schema.js'

export const SESSION_COOKIE = 'sid'
export const SESSION_IDLE_MS = 8 * 60 * 60 * 1000 // 8 hours without activity
export const SESSION_ABSOLUTE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days max
const TOUCH_INTERVAL_MS = 60 * 1000 // update last_seen_at at most once a minute

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export interface SessionMeta {
  ip?: string
  userAgent?: string
}

/** Creates a session and returns the raw token (only ever sent to the browser). */
export async function createSession(db: Db, userId: string, meta: SessionMeta): Promise<{ token: string; id: string }> {
  const token = randomBytes(32).toString('base64url')
  const id = hashToken(token)
  await db.insert(sessions).values({
    id,
    userId,
    expiresAt: new Date(Date.now() + SESSION_ABSOLUTE_MS),
    ip: meta.ip ?? null,
    userAgent: meta.userAgent?.slice(0, 500) ?? null,
  })
  return { token, id }
}

/** Returns the session + user for a token, or null if missing/expired/inactive (expired ones are deleted). */
export async function validateSession(db: Db, token: string): Promise<{ sessionId: string; user: UserRow } | null> {
  const id = hashToken(token)
  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, id))
    .limit(1)

  const row = rows[0]
  if (!row) return null

  const now = Date.now()
  const idleExpired = row.session.lastSeenAt.getTime() + SESSION_IDLE_MS <= now
  const absoluteExpired = row.session.expiresAt.getTime() <= now
  if (idleExpired || absoluteExpired || !row.user.isActive) {
    await db.delete(sessions).where(eq(sessions.id, id))
    return null
  }

  if (now - row.session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await db.update(sessions).set({ lastSeenAt: new Date(now) }).where(eq(sessions.id, id))
  }
  return { sessionId: id, user: row.user }
}

export async function revokeSession(db: Db, sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId))
}

/** Revoke all sessions of a user, optionally keeping one (the caller's current session). */
export async function revokeUserSessions(db: Db, userId: string, exceptSessionId?: string): Promise<void> {
  await db
    .delete(sessions)
    .where(
      exceptSessionId
        ? and(eq(sessions.userId, userId), ne(sessions.id, exceptSessionId))
        : eq(sessions.userId, userId),
    )
}

export async function cleanupExpiredSessions(db: Db): Promise<number> {
  const idleCutoff = new Date(Date.now() - SESSION_IDLE_MS)
  const deleted = await db
    .delete(sessions)
    .where(or(lt(sessions.expiresAt, sql`now()`), lt(sessions.lastSeenAt, idleCutoff)))
    .returning({ id: sessions.id })
  return deleted.length
}
