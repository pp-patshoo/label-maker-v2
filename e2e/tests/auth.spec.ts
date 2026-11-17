import { ADMIN } from './constants'
import { apiLoginStatus, expect, field, loginAs, pageTitle, submitLogin, t, test } from './fixtures'

test.describe('sign in and out', () => {
  test('signs in, then signs out and can no longer open pages', async ({ page, adminApi }) => {
    const user = await adminApi.createUser()
    await loginAs(page, user.username, user.password)
    await expect(pageTitle(page, 'menu.home')).toBeVisible()

    await page.getByRole('button', { name: user.displayName }).click()
    await page.getByRole('menuitem', { name: t('user.signOut') }).click()
    await expect(page).toHaveURL(/\/login$/)

    await page.goto('/settings')
    await expect(page).toHaveURL(/\/login\?redirect=%2Fsettings$/)
  })

  test('wrong password shows an error and keeps the user on the sign-in page', async ({ page, adminApi }) => {
    const user = await adminApi.createUser()
    await page.goto('/login')
    await submitLogin(page, user.username, 'not-the-password')
    await expect(page.getByRole('alert')).toHaveText(t('error.invalid_credentials'))
    await expect(page).toHaveURL(/\/login$/)
    await expect(field(page, t('login.password'))).toHaveValue('')
  })

  test('empty fields are rejected before calling the server', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: t('login.submit'), exact: true }).click()
    await expect(page.getByRole('alert')).toHaveText(t('error.required'))
  })

  test('locks the account after 5 wrong passwords', async ({ page, adminApi }) => {
    const user = await adminApi.createUser()
    await page.goto('/login')
    for (let i = 0; i < 4; i++) {
      await submitLogin(page, user.username, `wrong-${i}`)
      await expect(page.getByRole('alert')).toHaveText(t('error.invalid_credentials'))
    }
    await submitLogin(page, user.username, 'wrong-4')
    const locked = t('error.too_many_attempts', { minutes: 15 })
    await expect(page.getByRole('alert')).toHaveText(locked)

    // Even the right password is refused while locked
    await submitLogin(page, user.username, user.password)
    await expect(page.getByRole('alert')).toHaveText(locked)
    await expect(page).toHaveURL(/\/login$/)
  })

  test('opening a protected page first returns there after sign-in', async ({ page }) => {
    await page.goto('/users')
    await expect(page).toHaveURL(/\/login\?redirect=%2Fusers$/)
    await submitLogin(page, ADMIN.username, ADMIN.password)
    await expect(page).toHaveURL(/\/users$/)
    await expect(pageTitle(page, 'menu.users')).toBeVisible()
  })
})

test.describe('temporary password', () => {
  test('must be changed before using the app', async ({ page, adminApi }) => {
    const user = await adminApi.createUser({ temporary: true })
    await page.goto('/login')
    await submitLogin(page, user.username, user.password)
    await expect(page).toHaveURL(/\/change-password$/)
    await expect(page.getByRole('heading', { name: t('password.forced.title') })).toBeVisible()

    // Other pages send the user back here
    await page.goto('/settings')
    await expect(page).toHaveURL(/\/change-password$/)

    const newPassword = 'my-own-new-password'
    await field(page, t('password.current')).fill(user.password)
    await field(page, t('password.new')).fill(newPassword)
    await field(page, t('password.confirm')).fill(newPassword)
    await page.getByRole('button', { name: t('password.submit') }).click()

    await expect(page).toHaveURL(/\/$/)
    await expect(pageTitle(page, 'menu.home')).toBeVisible()
    await page.goto('/settings')
    await expect(pageTitle(page, 'menu.settings')).toBeVisible()
    expect(await apiLoginStatus(user.username, newPassword)).toBe(200)
    expect(await apiLoginStatus(user.username, user.password)).toBe(401)
  })
})

test.describe('session', () => {
  test('a revoked session sends the user back to sign-in with a notice', async ({ page, adminApi }) => {
    const user = await adminApi.createUser({ role: 'admin' })
    await loginAs(page, user.username, user.password)
    await page.goto('/users')
    await expect(pageTitle(page, 'menu.users')).toBeVisible()

    // Another admin resets this user's password, which signs out all their sessions
    await adminApi.resetPassword(user.id, 'reset-by-other-admin')

    await page.getByRole('button', { name: t('common.refresh') }).click()
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByText(t('login.sessionExpired'))).toBeVisible()
  })
})
