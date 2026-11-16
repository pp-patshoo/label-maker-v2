import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { hashToken } from '../src/auth/sessions.js'
import { loginEvents, sessions, users } from '../src/db/schema.js'
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

describe('login', () => {
  it('logs in with correct credentials and sets a secure cookie', async () => {
    await createUser(t.db, { username: 'alice', password: PW })
    const res = await req(t.app, 'POST', '/api/auth/login', { body: { username: '  Alice ', password: PW } })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ username: 'alice', role: 'user', mustChangePassword: false })
    expect(res.json()).not.toHaveProperty('passwordHash')

    const cookie = res.cookies.find((c) => c.name === 'sid')!
    expect(cookie.httpOnly).toBe(true)
    expect(cookie.sameSite).toBe('Lax')
    expect(cookie.path).toBe('/')

    // Only the hash of the token is stored
    const [s] = await t.db.select().from(sessions)
    expect(s.id).toBe(hashToken(cookie.value))
    expect(s.id).not.toBe(cookie.value)
  })

  it('returns the same 401 for wrong password, unknown user and inactive user', async () => {
    await createUser(t.db, { username: 'alice', password: PW })
    await createUser(t.db, { username: 'bob', password: PW, isActive: false })
    const wrong = await req(t.app, 'POST', '/api/auth/login', { body: { username: 'alice', password: 'nope-nope-nope' } })
    const unknown = await req(t.app, 'POST', '/api/auth/login', { body: { username: 'ghost', password: PW } })
    const inactive = await req(t.app, 'POST', '/api/auth/login', { body: { username: 'bob', password: PW } })
    for (const r of [wrong, unknown, inactive]) {
      expect(r.statusCode).toBe(401)
      expect(r.json()).toEqual({ error: 'invalid_credentials' })
    }
  })

  it('locks the account after 5 failed attempts and unlock lets the user in', async () => {
    const alice = await createUser(t.db, { username: 'alice', password: PW })
    await createUser(t.db, { username: 'root', password: PW, role: 'admin' })

    for (let i = 1; i <= 4; i++) {
      const r = await req(t.app, 'POST', '/api/auth/login', { body: { username: 'alice', password: 'wrong-wrong-1' } })
      expect(r.statusCode).toBe(401)
    }
    const fifth = await req(t.app, 'POST', '/api/auth/login', { body: { username: 'alice', password: 'wrong-wrong-1' } })
    expect(fifth.statusCode).toBe(429)
    expect(fifth.json()).toMatchObject({ error: 'too_many_attempts', retryAfter: 900 })

    // Even the correct password is refused while locked
    const locked = await req(t.app, 'POST', '/api/auth/login', { body: { username: 'alice', password: PW } })
    expect(locked.statusCode).toBe(429)

    const adminSid = await login(t.app, 'root', PW)
    const unlock = await req(t.app, 'POST', `/api/users/${alice.id}/unlock`, { cookie: adminSid })
    expect(unlock.statusCode).toBe(200)

    const ok = await req(t.app, 'POST', '/api/auth/login', { body: { username: 'alice', password: PW } })
    expect(ok.statusCode).toBe(200)
  })

  it('a successful login resets the failure counter', async () => {
    await createUser(t.db, { username: 'alice', password: PW })
    for (let i = 0; i < 4; i++) {
      await req(t.app, 'POST', '/api/auth/login', { body: { username: 'alice', password: 'wrong-wrong-1' } })
    }
    await login(t.app, 'alice', PW)
    const [u] = await t.db.select().from(users).where(eq(users.username, 'alice'))
    expect(u.failedAttempts).toBe(0)
  })

  it('records login events', async () => {
    await createUser(t.db, { username: 'alice', password: PW })
    await req(t.app, 'POST', '/api/auth/login', { body: { username: 'alice', password: 'wrong-wrong-1' } })
    await req(t.app, 'POST', '/api/auth/login', { body: { username: 'nobody', password: PW } })
    await login(t.app, 'alice', PW)
    const events = await t.db.select().from(loginEvents).orderBy(loginEvents.id)
    expect(events.map((e) => [e.usernameAttempted, e.reason, e.success])).toEqual([
      ['alice', 'invalid', false],
      ['nobody', 'invalid', false],
      ['alice', 'ok', true],
    ])
    expect(events[1].userId).toBeNull()
  })

  it('rate limits login per IP', async () => {
    const limited = await setupApp({ loginRateLimitMax: 3 })
    try {
      for (let i = 0; i < 3; i++) {
        await req(limited.app, 'POST', '/api/auth/login', { body: { username: 'x', password: 'y' } })
      }
      const r = await req(limited.app, 'POST', '/api/auth/login', { body: { username: 'x', password: 'y' } })
      expect(r.statusCode).toBe(429)
      expect(r.json().error).toBe('too_many_attempts')
      expect(typeof r.json().retryAfter).toBe('number')
    } finally {
      await limited.close()
    }
  })
})

describe('session', () => {
  it('/me returns the user, logout invalidates the cookie', async () => {
    await createUser(t.db, { username: 'alice', password: PW })
    const sid = await login(t.app, 'alice', PW)
    expect((await req(t.app, 'GET', '/api/auth/me', { cookie: sid })).statusCode).toBe(200)

    const out = await req(t.app, 'POST', '/api/auth/logout', { cookie: sid })
    expect(out.statusCode).toBe(204)
    expect((await req(t.app, 'GET', '/api/auth/me', { cookie: sid })).statusCode).toBe(401)
  })

  it('/me without cookie is 401', async () => {
    const r = await req(t.app, 'GET', '/api/auth/me')
    expect(r.statusCode).toBe(401)
    expect(r.json()).toEqual({ error: 'unauthorized' })
  })

  it('expires after 8 hours idle', async () => {
    await createUser(t.db, { username: 'alice', password: PW })
    const sid = await login(t.app, 'alice', PW)
    await t.db
      .update(sessions)
      .set({ lastSeenAt: new Date(Date.now() - 8 * 3600_000 - 1000) })
      .where(eq(sessions.id, hashToken(sid)))
    expect((await req(t.app, 'GET', '/api/auth/me', { cookie: sid })).statusCode).toBe(401)
    expect(await t.db.select().from(sessions)).toHaveLength(0)
  })

  it('expires after 7 days even when active', async () => {
    await createUser(t.db, { username: 'alice', password: PW })
    const sid = await login(t.app, 'alice', PW)
    await t.db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(sessions.id, hashToken(sid)))
    expect((await req(t.app, 'GET', '/api/auth/me', { cookie: sid })).statusCode).toBe(401)
  })

  it('a forged cookie is rejected', async () => {
    expect((await req(t.app, 'GET', '/api/auth/me', { cookie: 'not-a-real-token' })).statusCode).toBe(401)
  })
})

describe('change password', () => {
  it('forces a password change before other endpoints can be used', async () => {
    await createUser(t.db, { username: 'root', password: PW, role: 'admin', mustChangePassword: true })
    const sid = await login(t.app, 'root', PW)

    expect((await req(t.app, 'GET', '/api/auth/me', { cookie: sid })).json().mustChangePassword).toBe(true)
    const blocked = await req(t.app, 'GET', '/api/users', { cookie: sid })
    expect(blocked.statusCode).toBe(403)
    expect(blocked.json()).toEqual({ error: 'password_change_required' })

    const changed = await req(t.app, 'POST', '/api/auth/change-password', {
      cookie: sid,
      body: { currentPassword: PW, newPassword: 'a-brand-new-password' },
    })
    expect(changed.statusCode).toBe(200)
    expect(changed.json().mustChangePassword).toBe(false)
    expect((await req(t.app, 'GET', '/api/users', { cookie: sid })).statusCode).toBe(200)
  })

  it('validates current and new password', async () => {
    await createUser(t.db, { username: 'alice', password: PW })
    const sid = await login(t.app, 'alice', PW)
    const call = (currentPassword: string, newPassword: string) =>
      req(t.app, 'POST', '/api/auth/change-password', { cookie: sid, body: { currentPassword, newPassword } })

    expect((await call('wrong-current', 'whatever-long-1')).json()).toEqual({ error: 'invalid_current_password' })
    expect((await call(PW, 'short')).json()).toEqual({ error: 'password_too_short' })
    expect((await call(PW, 'x'.repeat(129))).json()).toEqual({ error: 'password_too_long' })
    expect((await call(PW, PW)).json()).toEqual({ error: 'password_same_as_current' })
    // 10 Thai characters count as 10, not by UTF-16 length
    expect((await call(PW, 'รหัสผ่านใหม่ดีมาก')).statusCode).toBe(200)
  })

  it('rejects a password equal to the username', async () => {
    await createUser(t.db, { username: 'longusername', password: PW })
    const sid = await login(t.app, 'longusername', PW)
    const r = await req(t.app, 'POST', '/api/auth/change-password', {
      cookie: sid,
      body: { currentPassword: PW, newPassword: 'LongUsername' },
    })
    expect(r.json()).toEqual({ error: 'password_same_as_username' })
  })

  it('signs out other sessions but keeps the current one', async () => {
    await createUser(t.db, { username: 'alice', password: PW })
    const laptop = await login(t.app, 'alice', PW)
    const phone = await login(t.app, 'alice', PW)
    await req(t.app, 'POST', '/api/auth/change-password', {
      cookie: laptop,
      body: { currentPassword: PW, newPassword: 'a-brand-new-password' },
    })
    expect((await req(t.app, 'GET', '/api/auth/me', { cookie: laptop })).statusCode).toBe(200)
    expect((await req(t.app, 'GET', '/api/auth/me', { cookie: phone })).statusCode).toBe(401)
  })
})

describe('CSRF protection', () => {
  it('rejects state-changing requests from another origin', async () => {
    await createUser(t.db, { username: 'alice', password: PW })
    const r = await req(t.app, 'POST', '/api/auth/login', {
      body: { username: 'alice', password: PW },
      headers: { origin: 'https://evil.example' },
    })
    expect(r.statusCode).toBe(403)
    expect(r.json()).toEqual({ error: 'bad_origin' })
  })

  it('rejects non-JSON state-changing requests (e.g. HTML form posts)', async () => {
    await createUser(t.db, { username: 'alice', password: PW })
    const sid = await login(t.app, 'alice', PW)
    const r = await t.app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie: `sid=${sid}`, 'content-type': 'text/plain' },
      payload: 'x',
    })
    expect(r.statusCode).toBe(415)
    expect((await req(t.app, 'GET', '/api/auth/me', { cookie: sid })).statusCode).toBe(200)
  })
})
