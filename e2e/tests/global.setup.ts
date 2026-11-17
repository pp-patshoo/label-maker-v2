import { test as setup } from '@playwright/test'
import { ADMIN, ADMIN_STATE } from './constants'
import { apiClient, expect, loginAs } from './fixtures'

/**
 * Runs once before the specs. The backend has just created the first admin with a temporary
 * password: change it, then save a signed-in admin session for specs that start signed in.
 */
setup('prepare admin account', async ({ page }) => {
  const api = await apiClient()
  const login = await api.post('/api/auth/login', { data: { username: ADMIN.username, password: ADMIN.tempPassword } })
  expect(login.status(), 'bootstrap admin sign-in (is the DB fresh?)').toBe(200)
  expect((await login.json()).mustChangePassword).toBe(true)
  const change = await api.post('/api/auth/change-password', {
    data: { currentPassword: ADMIN.tempPassword, newPassword: ADMIN.password },
  })
  expect(change.status(), await change.text()).toBe(200)
  await api.dispose()

  await page.addInitScript(() => localStorage.setItem('lang', 'en'))
  await loginAs(page, ADMIN.username, ADMIN.password)
  await page.context().storageState({ path: ADMIN_STATE })
})
