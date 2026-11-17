import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { listActiveAdmins, resetAdmin, ResetAdminError } from '../src/cli/resetAdmin.js'
import { loginEvents, users } from '../src/db/schema.js'
import { createUser, login, req, resetDb, setupApp } from './helpers.js'
import type { TestContext } from './helpers.js'

const PW = 'correct-horse-battery'
let t: TestContext

beforeAll(async () => {
  t = await setupApp()
})
afterAll(async () => {
  await t.close()
})
beforeEach(async () => {
  await resetDb(t.db)
})

describe('reset-admin CLI', () => {
  it('gives an admin a working temporary password and signs out old sessions', async () => {
    await createUser(t.db, { username: 'root', password: PW, role: 'admin' })
    const oldSid = await login(t.app, 'root', PW)

    const temp = await resetAdmin(t.db, '  ROOT ')
    expect(temp).toHaveLength(16)

    expect((await req(t.app, 'GET', '/api/auth/me', { cookie: oldSid })).statusCode).toBe(401)
    expect((await req(t.app, 'POST', '/api/auth/login', { body: { username: 'root', password: PW } })).statusCode).toBe(401)
    const res = await req(t.app, 'POST', '/api/auth/login', { body: { username: 'root', password: temp } })
    expect(res.statusCode).toBe(200)
    expect(res.json().mustChangePassword).toBe(true)
  })

  it('clears a lockout', async () => {
    const root = await createUser(t.db, { username: 'root', password: PW, role: 'admin' })
    await t.db
      .update(users)
      .set({ failedAttempts: 5, lockedUntil: new Date(Date.now() + 15 * 60_000) })
      .where(eq(users.id, root.id))

    const temp = await resetAdmin(t.db, 'root')
    const [row] = await t.db.select().from(users).where(eq(users.id, root.id))
    expect(row.failedAttempts).toBe(0)
    expect(row.lockedUntil).toBeNull()
    await login(t.app, 'root', temp)
  })

  it('records a cli_reset event that does not count as a login', async () => {
    const root = await createUser(t.db, { username: 'root', password: PW, role: 'admin' })
    await resetAdmin(t.db, 'root')
    const events = await t.db.select().from(loginEvents)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ userId: root.id, reason: 'cli_reset', success: false })
  })

  it('refuses unknown users, normal users and deactivated admins without changing them', async () => {
    const alice = await createUser(t.db, { username: 'alice', password: PW })
    await createUser(t.db, { username: 'old', password: PW, role: 'admin', isActive: false })

    await expect(resetAdmin(t.db, 'nobody')).rejects.toBeInstanceOf(ResetAdminError)
    await expect(resetAdmin(t.db, 'alice')).rejects.toThrow(/not an admin/)
    await expect(resetAdmin(t.db, 'old')).rejects.toThrow(/deactivated/)

    const [row] = await t.db.select().from(users).where(eq(users.id, alice.id))
    expect(row.passwordHash).toBe(alice.passwordHash)
    expect(await t.db.select().from(loginEvents)).toHaveLength(0)
  })

  it('lists only active admins', async () => {
    await createUser(t.db, { username: 'zed', password: PW, role: 'admin' })
    await createUser(t.db, { username: 'amy', password: PW, role: 'admin' })
    await createUser(t.db, { username: 'old', password: PW, role: 'admin', isActive: false })
    await createUser(t.db, { username: 'bob', password: PW })
    expect(await listActiveAdmins(t.db)).toEqual(['amy', 'zed'])
  })
})
