import { count } from 'drizzle-orm'
import type { FastifyBaseLogger } from 'fastify'
import { hashPassword, validatePassword } from './auth/password.js'
import type { Config } from './config.js'
import type { Db } from './db/client.js'
import { users } from './db/schema.js'

/**
 * On first start (no users at all) create the initial admin from ADMIN_USERNAME / ADMIN_PASSWORD.
 * The password is treated as temporary: the admin must change it after the first login.
 */
export async function bootstrapAdmin(db: Db, config: Config, log: Pick<FastifyBaseLogger, 'info'>): Promise<void> {
  const [{ total }] = await db.select({ total: count() }).from(users)
  if (total > 0) return

  const username = config.admin.username?.trim().toLowerCase()
  const password = config.admin.password
  if (!username || !password) {
    throw new Error('No users exist yet: set ADMIN_USERNAME and ADMIN_PASSWORD to create the first admin.')
  }
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    throw new Error('ADMIN_USERNAME must be 3-32 characters: a-z, 0-9, dot, underscore or dash.')
  }
  const issue = validatePassword(password, username)
  if (issue) throw new Error(`ADMIN_PASSWORD is not acceptable: ${issue}`)

  await db.insert(users).values({
    username,
    displayName: config.admin.displayName?.trim() || 'Administrator',
    role: 'admin',
    passwordHash: await hashPassword(password),
    mustChangePassword: true,
  })
  log.info({ username }, 'created initial admin user (must change password at first login)')
}
