import { randomBytes } from 'node:crypto'
import { and, asc, eq } from 'drizzle-orm'
import { recordLoginEvent } from '../audit/loginEvents.js'
import { validatePassword } from '../auth/password.js'
import type { Db } from '../db/client.js'
import { users } from '../db/schema.js'
import { setTemporaryPassword } from '../users/passwordReset.js'

/** Error with a message meant for the person running the command. */
export class ResetAdminError extends Error {}

export async function listActiveAdmins(db: Db): Promise<string[]> {
  const rows = await db
    .select({ username: users.username })
    .from(users)
    .where(and(eq(users.role, 'admin'), eq(users.isActive, true)))
    .orderBy(asc(users.username))
  return rows.map((r) => r.username)
}

/** 12 random bytes -> 16 base64url characters (~96 bits). */
function generateTempPassword(username: string): string {
  for (;;) {
    const password = randomBytes(12).toString('base64url')
    if (!validatePassword(password, username)) return password
  }
}

/**
 * Reset an active admin's password to a random temporary one (must change at next login),
 * clear any lockout, sign out their sessions and record a `cli_reset` login event.
 * Returns the temporary password; the caller shows it once.
 */
export async function resetAdmin(db: Db, rawUsername: string): Promise<string> {
  const username = rawUsername.trim().toLowerCase()
  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1)
  if (!user) throw new ResetAdminError(`No user named "${username}".`)
  if (user.role !== 'admin') throw new ResetAdminError(`"${username}" is not an admin.`)
  if (!user.isActive) throw new ResetAdminError(`"${username}" is deactivated.`)

  const password = generateTempPassword(username)
  await setTemporaryPassword(db, user.id, password)
  await recordLoginEvent(db, { userId: user.id, usernameAttempted: username, reason: 'cli_reset' })
  return password
}
