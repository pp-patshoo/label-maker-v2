import { buildApp } from './app.js'
import { cleanupExpiredSessions } from './auth/sessions.js'
import { bootstrapAdmin } from './bootstrap.js'
import { loadConfig } from './config.js'
import { createDb, runMigrations } from './db/client.js'

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000 // hourly

async function main() {
  const config = loadConfig()
  const { db, pool } = createDb(config.databaseUrl)
  const app = await buildApp({ config, db })

  await runMigrations(db)
  app.log.info('database migrations applied')
  await bootstrapAdmin(db, config, app.log)

  const timer = setInterval(() => {
    cleanupExpiredSessions(db)
      .then((n) => n > 0 && app.log.info({ removed: n }, 'expired sessions cleaned up'))
      .catch((err) => app.log.error(err, 'session cleanup failed'))
  }, CLEANUP_INTERVAL_MS)
  timer.unref()

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'shutting down')
    clearInterval(timer)
    await app.close()
    await pool.end()
    process.exit(0)
  }
  process.once('SIGTERM', () => void shutdown('SIGTERM'))
  process.once('SIGINT', () => void shutdown('SIGINT'))

  await app.listen({ host: config.host, port: config.port })
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
