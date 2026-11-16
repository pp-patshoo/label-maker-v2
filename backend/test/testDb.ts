import { existsSync } from 'node:fs'

/**
 * Test DB = same server/credentials as DATABASE_URL in backend/.env, database `labelmaker_test`.
 * Override with TEST_DATABASE_URL.
 */
export function testDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL
  if (!process.env.DATABASE_URL && existsSync('.env')) process.loadEnvFile('.env')
  const base = process.env.DATABASE_URL
  if (!base) throw new Error('Set DATABASE_URL (backend/.env) or TEST_DATABASE_URL to run tests')
  const url = new URL(base)
  url.pathname = '/labelmaker_test'
  return url.toString()
}
