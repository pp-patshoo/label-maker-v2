/**
 * Started by Playwright (webServer). Recreates the throwaway labelmaker_e2e database,
 * then runs the backend from source. Migrations and the first admin are created by the
 * backend on start. Settings (port, origin, admin) come from the env set in playwright.config.ts.
 *
 * Database server/credentials: E2E_DATABASE_URL, or DATABASE_URL from backend/.env
 * (same server as dev; only the database name is replaced).
 */
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'
import pg from 'pg'

const backendDir = fileURLToPath(new URL('../../backend/', import.meta.url))
const DB_NAME = 'labelmaker_e2e'

function databaseUrl() {
  if (process.env.E2E_DATABASE_URL) return process.env.E2E_DATABASE_URL
  const envFile = `${backendDir}.env`
  if (!existsSync(envFile)) throw new Error('Set E2E_DATABASE_URL or create backend/.env (DATABASE_URL)')
  const base = parseEnv(readFileSync(envFile, 'utf8')).DATABASE_URL
  if (!base) throw new Error('DATABASE_URL is missing in backend/.env')
  const url = new URL(base)
  url.pathname = `/${DB_NAME}`
  return url.toString()
}

async function recreateDatabase(url) {
  const name = new URL(url).pathname.slice(1)
  if (!/^[a-z0-9_]+$/.test(name) || !name.endsWith('_e2e')) {
    throw new Error(`Refusing to recreate non-E2E database "${name}"`)
  }
  const adminUrl = new URL(url)
  adminUrl.pathname = '/postgres'
  const client = new pg.Client({ connectionString: adminUrl.toString() })
  await client.connect()
  try {
    await client.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`)
    await client.query(`CREATE DATABASE ${name}`)
  } finally {
    await client.end()
  }
}

const url = databaseUrl()
await recreateDatabase(url)

// Run tsx through node directly (no shell), so Playwright can stop the process tree cleanly.
const tsxCli = `${backendDir}node_modules/tsx/dist/cli.mjs`
const child = spawn(process.execPath, [tsxCli, 'src/server.ts'], {
  cwd: backendDir,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: url, LOG_LEVEL: process.env.LOG_LEVEL ?? 'warn' },
})
child.on('exit', (code) => process.exit(code ?? 1))
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
