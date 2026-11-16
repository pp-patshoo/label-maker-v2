import type { FastifyInstance } from 'fastify'
import { sql } from 'drizzle-orm'
import { buildApp } from '../src/app.js'
import { hashPassword } from '../src/auth/password.js'
import type { Config } from '../src/config.js'
import { createDb } from '../src/db/client.js'
import type { Db } from '../src/db/client.js'
import { users } from '../src/db/schema.js'
import { testDatabaseUrl } from './testDb.js'

export const ORIGIN = 'http://localhost:5173'

export function testConfig(overrides: Partial<Config> = {}): Config {
  return {
    env: 'test',
    host: '127.0.0.1',
    port: 0,
    logLevel: 'silent',
    databaseUrl: testDatabaseUrl(),
    allowedOrigins: [ORIGIN],
    cookieSecure: false,
    loginRateLimitMax: 1000,
    admin: {},
    ...overrides,
  }
}

export interface TestContext {
  app: FastifyInstance
  db: Db
  close: () => Promise<void>
}

export async function setupApp(overrides: Partial<Config> = {}): Promise<TestContext> {
  const config = testConfig(overrides)
  const { db, pool } = createDb(config.databaseUrl)
  const app = await buildApp({ config, db, logger: false })
  await app.ready()
  return {
    app,
    db,
    close: async () => {
      await app.close()
      await pool.end()
    },
  }
}

export async function resetDb(db: Db): Promise<void> {
  await db.execute(sql`TRUNCATE users, sessions, login_events RESTART IDENTITY CASCADE`)
}

export async function createUser(
  db: Db,
  u: { username: string; password: string; role?: 'admin' | 'user'; mustChangePassword?: boolean; isActive?: boolean },
) {
  const [row] = await db
    .insert(users)
    .values({
      username: u.username,
      displayName: u.username.toUpperCase(),
      passwordHash: await hashPassword(u.password),
      role: u.role ?? 'user',
      mustChangePassword: u.mustChangePassword ?? false,
      isActive: u.isActive ?? true,
    })
    .returning()
  return row
}

/** JSON request helper (always sends JSON + allowed Origin, like the real frontend). */
export function req(app: FastifyInstance, method: 'GET' | 'POST' | 'PATCH', url: string, opts: { body?: unknown; cookie?: string; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { origin: ORIGIN, ...opts.headers }
  if (opts.cookie) headers.cookie = `sid=${opts.cookie}`
  return app.inject({
    method,
    url,
    headers,
    ...(method === 'GET' ? {} : { payload: (opts.body ?? {}) as object }),
  })
}

export async function login(app: FastifyInstance, username: string, password: string): Promise<string> {
  const res = await req(app, 'POST', '/api/auth/login', { body: { username, password } })
  if (res.statusCode !== 200) throw new Error(`login failed: ${res.statusCode} ${res.body}`)
  const sid = res.cookies.find((c) => c.name === 'sid')?.value
  if (!sid) throw new Error('no sid cookie')
  return sid
}
