import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { bootstrapAdmin } from '../src/bootstrap.js'
import { users } from '../src/db/schema.js'
import { createUser, login, req, resetDb, setupApp, testConfig } from './helpers.js'
import type { TestContext } from './helpers.js'

const PW = 'correct-horse-battery'
let t: TestContext
let adminSid: string
let adminId: string

beforeAll(async () => {
  t = await setupApp()
})
afterAll(async () => {
  await t.close()
})
beforeEach(async () => {
  await resetDb(t.db)
  adminId = (await createUser(t.db, { username: 'root', password: PW, role: 'admin' })).id
  adminSid = await login(t.app, 'root', PW)
})

describe('access control', () => {
  it('normal users cannot use admin endpoints', async () => {
    await createUser(t.db, { username: 'alice', password: PW })
    const sid = await login(t.app, 'alice', PW)
    for (const [method, url] of [
      ['GET', '/api/users'],
      ['POST', '/api/users'],
      ['GET', '/api/login-events'],
    ] as const) {
      const r = await req(t.app, method, url, { cookie: sid })
      expect(r.statusCode, url).toBe(403)
      expect(r.json()).toEqual({ error: 'forbidden' })
    }
  })

  it('anonymous requests get 401', async () => {
    expect((await req(t.app, 'GET', '/api/users')).statusCode).toBe(401)
  })
})

describe('user management', () => {
  it('creates a user who must change the temporary password', async () => {
    const r = await req(t.app, 'POST', '/api/users', {
      cookie: adminSid,
      body: { username: 'Somchai', displayName: 'สมชาย', role: 'user', tempPassword: 'temporary-pass' },
    })
    expect(r.statusCode).toBe(201)
    expect(r.json()).toMatchObject({ username: 'somchai', displayName: 'สมชาย', mustChangePassword: true, isActive: true })

    const sid = await login(t.app, 'somchai', 'temporary-pass')
    expect((await req(t.app, 'GET', '/api/auth/me', { cookie: sid })).json().mustChangePassword).toBe(true)

    const [row] = await t.db.select().from(users).where(eq(users.username, 'somchai'))
    expect(row.passwordHash.startsWith('$argon2id$')).toBe(true)
  })

  it('validates new users', async () => {
    const create = (body: object) => req(t.app, 'POST', '/api/users', { cookie: adminSid, body })
    expect((await create({ username: 'ab', displayName: 'x', role: 'user', tempPassword: 'temporary-pass' })).json()).toEqual({ error: 'invalid_request' })
    expect((await create({ username: 'bad name', displayName: 'x', role: 'user', tempPassword: 'temporary-pass' })).statusCode).toBe(400)
    expect((await create({ username: 'carol', displayName: 'x', role: 'user', tempPassword: 'short' })).json()).toEqual({ error: 'password_too_short' })
    expect((await create({ username: 'root', displayName: 'x', role: 'user', tempPassword: 'temporary-pass' })).json()).toEqual({ error: 'username_taken' })
  })

  it('lists users without password hashes, including last login', async () => {
    const r = await req(t.app, 'GET', '/api/users', { cookie: adminSid })
    expect(r.statusCode).toBe(200)
    const [root] = r.json()
    expect(root).not.toHaveProperty('passwordHash')
    expect(root.username).toBe('root')
    expect(root.lastLoginAt).not.toBeNull()
  })

  it('updates display name and role', async () => {
    const alice = await createUser(t.db, { username: 'alice', password: PW })
    const r = await req(t.app, 'PATCH', `/api/users/${alice.id}`, {
      cookie: adminSid,
      body: { displayName: 'Alice A.', role: 'admin' },
    })
    expect(r.json()).toMatchObject({ displayName: 'Alice A.', role: 'admin' })
  })

  it('deactivating a user signs them out', async () => {
    const alice = await createUser(t.db, { username: 'alice', password: PW })
    const sid = await login(t.app, 'alice', PW)
    await req(t.app, 'PATCH', `/api/users/${alice.id}`, { cookie: adminSid, body: { isActive: false } })
    expect((await req(t.app, 'GET', '/api/auth/me', { cookie: sid })).statusCode).toBe(401)
    expect((await req(t.app, 'POST', '/api/auth/login', { body: { username: 'alice', password: PW } })).statusCode).toBe(401)
  })

  it('an admin cannot deactivate, demote or reset themselves', async () => {
    const self = (body: object) => req(t.app, 'PATCH', `/api/users/${adminId}`, { cookie: adminSid, body })
    expect((await self({ isActive: false })).json()).toEqual({ error: 'cannot_modify_self' })
    expect((await self({ role: 'user' })).json()).toEqual({ error: 'cannot_modify_self' })
    expect((await self({ displayName: 'Boss' })).statusCode).toBe(200)
    const reset = await req(t.app, 'POST', `/api/users/${adminId}/reset-password`, {
      cookie: adminSid,
      body: { tempPassword: 'temporary-pass' },
    })
    expect(reset.json()).toEqual({ error: 'cannot_modify_self' })
  })

  it('reset password signs the user out and forces a change', async () => {
    const alice = await createUser(t.db, { username: 'alice', password: PW })
    const sid = await login(t.app, 'alice', PW)
    const r = await req(t.app, 'POST', `/api/users/${alice.id}/reset-password`, {
      cookie: adminSid,
      body: { tempPassword: 'temporary-pass' },
    })
    expect(r.json().mustChangePassword).toBe(true)
    expect((await req(t.app, 'GET', '/api/auth/me', { cookie: sid })).statusCode).toBe(401)
    expect((await req(t.app, 'POST', '/api/auth/login', { body: { username: 'alice', password: PW } })).statusCode).toBe(401)
    await login(t.app, 'alice', 'temporary-pass')
  })

  it('unknown or malformed ids give 404', async () => {
    const missing = await req(t.app, 'POST', '/api/users/00000000-0000-0000-0000-000000000000/unlock', { cookie: adminSid })
    expect(missing.statusCode).toBe(404)
    const malformed = await req(t.app, 'PATCH', '/api/users/123', { cookie: adminSid, body: { displayName: 'x' } })
    expect(malformed.statusCode).toBe(404)
  })
})

describe('login events', () => {
  it('lists events newest first with paging', async () => {
    await req(t.app, 'POST', '/api/auth/login', { body: { username: 'root', password: 'wrong-wrong-1' } })
    await req(t.app, 'POST', '/api/auth/login', { body: { username: 'ghost', password: 'wrong-wrong-1' } })
    const r = await req(t.app, 'GET', '/api/login-events?limit=2', { cookie: adminSid })
    expect(r.statusCode).toBe(200)
    const body = r.json()
    expect(body.total).toBe(3) // admin login in beforeEach + 2 failures
    expect(body.items).toHaveLength(2)
    expect(body.items[0].usernameAttempted).toBe('ghost')
    expect(body.items[1]).toMatchObject({ usernameAttempted: 'root', reason: 'invalid', displayName: 'ROOT' })
  })
})

describe('bootstrap admin', () => {
  it('creates the first admin only when there are no users', async () => {
    await resetDb(t.db)
    const config = testConfig({ admin: { username: 'Admin', password: 'initial-admin-pass' } })
    const log = { info: () => {} }
    await bootstrapAdmin(t.db, config, log)
    await bootstrapAdmin(t.db, config, log) // second call is a no-op
    const all = await t.db.select().from(users)
    expect(all).toHaveLength(1)
    expect(all[0]).toMatchObject({ username: 'admin', role: 'admin', mustChangePassword: true })
  })

  it('fails clearly when no admin credentials are configured', async () => {
    await resetDb(t.db)
    await expect(bootstrapAdmin(t.db, testConfig(), { info: () => {} })).rejects.toThrow(/ADMIN_USERNAME/)
  })
})
