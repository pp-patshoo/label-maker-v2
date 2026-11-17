/**
 * Recover access when every admin has forgotten their password.
 *
 *   node dist/cli/reset-admin.js              list active admins
 *   node dist/cli/reset-admin.js <username>   give that admin a random temporary password
 *
 * In Docker: docker compose exec backend node dist/cli/reset-admin.js <username>
 * In dev:    npm run reset-admin -- <username>
 * Only needs DATABASE_URL.
 */
import { createDb, runMigrations } from '../db/client.js'
import { listActiveAdmins, resetAdmin, ResetAdminError } from './resetAdmin.js'

async function main(): Promise<number> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set.')
    return 1
  }
  const username = process.argv[2]
  const { db, pool } = createDb(databaseUrl)
  try {
    await runMigrations(db)

    if (!username) {
      const admins = await listActiveAdmins(db)
      console.log('Usage: reset-admin <username>\n')
      console.log(admins.length ? `Active admins:\n${admins.map((a) => `  ${a}`).join('\n')}` : 'No active admins.')
      return 0
    }

    const password = await resetAdmin(db, username)
    console.log(`Password for "${username.trim().toLowerCase()}" has been reset.`)
    console.log(`Temporary password (shown only once): ${password}`)
    console.log('They must choose a new password after signing in. All their sessions were signed out.')
    return 0
  } catch (err) {
    console.error(err instanceof ResetAdminError ? err.message : `Reset failed: ${err instanceof Error ? err.message : String(err)}`)
    return 1
  } finally {
    await pool.end()
  }
}

process.exitCode = await main()
