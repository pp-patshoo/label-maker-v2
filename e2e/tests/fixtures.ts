import { randomBytes } from 'node:crypto'
import { test as base, expect, request } from '@playwright/test'
import type { APIRequestContext, Locator, Page } from '@playwright/test'
import { en } from '../../frontend/src/i18n/en'
import type { TranslationKey } from '../../frontend/src/i18n/en'
import { ADMIN, BASE_URL } from './constants'

export { expect }

/** UI text in English (the fixture sets the UI language to en), with {var} placeholders filled in. */
export function t(key: TranslationKey, vars: Record<string, string | number> = {}): string {
  return en[key].replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m))
}

/** The input/select inside the <label> whose caption is exactly `caption` (avoids "New password" matching "Confirm new password"). */
export function field(scope: Page | Locator, caption: string): Locator {
  // The `has` locator is resolved inside each <label>, so build it from the page, not from `scope`.
  const page = 'goto' in scope ? scope : scope.page()
  return scope
    .locator('label')
    .filter({ has: page.locator('span').getByText(caption, { exact: true }) })
    .locator('input, select')
    .first()
}

export function uniqueName(prefix = 'u'): string {
  return `${prefix}${Date.now().toString(36)}${randomBytes(2).toString('hex')}`
}

export interface TestUser {
  id: string
  username: string
  displayName: string
  password: string
}

/** API client with the Origin header the backend requires for state-changing requests (CSRF check). */
export async function apiClient(): Promise<APIRequestContext> {
  return request.newContext({ baseURL: BASE_URL, extraHTTPHeaders: { Origin: BASE_URL } })
}

/** Status code of a login attempt through the API (does not keep the session). */
export async function apiLoginStatus(username: string, password: string): Promise<number> {
  const api = await apiClient()
  try {
    const res = await api.post('/api/auth/login', { data: { username, password } })
    return res.status()
  } finally {
    await api.dispose()
  }
}

export class AdminApi {
  constructor(readonly api: APIRequestContext) {}

  static async signIn(): Promise<AdminApi> {
    const api = await apiClient()
    const res = await api.post('/api/auth/login', { data: { username: ADMIN.username, password: ADMIN.password } })
    expect(res.status(), 'admin API sign-in').toBe(200)
    return new AdminApi(api)
  }

  /**
   * Create a user with a unique name. By default the temporary password is changed right away
   * (like a user who has signed in before); pass `temporary: true` to keep it.
   */
  async createUser(opts: { role?: 'admin' | 'user'; temporary?: boolean } = {}): Promise<TestUser> {
    const username = uniqueName()
    const displayName = `Test ${username}`
    const tempPassword = `temp-${randomBytes(6).toString('hex')}`
    const res = await this.api.post('/api/users', {
      data: { username, displayName, role: opts.role ?? 'user', tempPassword },
    })
    expect(res.ok(), await res.text()).toBe(true) // 201 Created
    const { id } = (await res.json()) as { id: string }
    if (opts.temporary) return { id, username, displayName, password: tempPassword }

    const password = `pass-${randomBytes(6).toString('hex')}`
    const userApi = await apiClient()
    try {
      expect((await userApi.post('/api/auth/login', { data: { username, password: tempPassword } })).status()).toBe(200)
      const change = await userApi.post('/api/auth/change-password', {
        data: { currentPassword: tempPassword, newPassword: password },
      })
      expect(change.status(), await change.text()).toBe(200)
    } finally {
      await userApi.dispose()
    }
    return { id, username, displayName, password }
  }

  async resetPassword(id: string, tempPassword: string): Promise<void> {
    const res = await this.api.post(`/api/users/${id}/reset-password`, { data: { tempPassword } })
    expect(res.status(), await res.text()).toBe(200)
  }

  /** Lock an account the way an attacker would: 5 wrong passwords in a row. */
  async lock(username: string): Promise<void> {
    for (let i = 0; i < 5; i++) await apiLoginStatus(username, 'wrong-password-x')
  }
}

/** Fill in and submit the sign-in form on the current page (no navigation, no waiting). */
export async function submitLogin(page: Page, username: string, password: string): Promise<void> {
  await field(page, t('login.username')).fill(username)
  await field(page, t('login.password')).fill(password)
  await page.getByRole('button', { name: t('login.submit'), exact: true }).click()
}

/** Sign in through the real login page and wait until the app has left it. */
export async function loginAs(page: Page, username: string, password: string): Promise<void> {
  await page.goto('/login')
  await submitLogin(page, username, password)
  await expect(page).not.toHaveURL(/\/login/)
}

export function pageTitle(page: Page, key: TranslationKey): Locator {
  return page.getByRole('heading', { level: 1, name: t(key), exact: true })
}

export function userRow(page: Page, username: string): Locator {
  return page.getByRole('row').filter({ has: page.getByRole('cell', { name: username, exact: false }) })
}

interface Fixtures {
  adminApi: AdminApi
}

export const test = base.extend<Fixtures>({
  // Start every page in English (unless the test already switched language: the value persists across reloads).
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      if (!localStorage.getItem('lang')) localStorage.setItem('lang', 'en')
    })
    await use(page)
  },
  adminApi: async ({}, use) => {
    const admin = await AdminApi.signIn()
    await use(admin)
    await admin.api.dispose()
  },
})
