import { eq } from 'drizzle-orm'
import { hashPassword } from '../auth/password.js'
import { revokeUserSessions } from '../auth/sessions.js'
import type { Db } from '../db/client.js'
import { users } from '../db/schema.js'
import type { UserRow } from '../db/schema.js'

/**
 * Give a user a temporary password: they must change it at next login,
 * any lockout is cleared and all their sessions are signed out.
 * The caller must validate the password first (validatePassword).
 * Used by the admin API and the reset-admin CLI.
 */
export async function setTemporaryPassword(db: Db, userId: string, password: string): Promise<UserRow | undefined> {
  const now = new Date()
  const [updated] = await db
    .update(users)
    .set({
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
      failedAttempts: 0,
      lockedUntil: null,
      passwordChangedAt: now,
      updatedAt: now,
    })
    .where(eq(users.id, userId))
    .returning()
  if (updated) await revokeUserSessions(db, userId)
  return updated
}
