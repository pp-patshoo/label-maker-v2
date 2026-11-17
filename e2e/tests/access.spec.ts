import { apiLoginStatus, expect, field, loginAs, pageTitle, t, test } from './fixtures'

test.describe('roles', () => {
  test('a normal user cannot see or open User Management', async ({ page, adminApi }) => {
    const user = await adminApi.createUser()
    await loginAs(page, user.username, user.password)

    const nav = page.getByRole('navigation')
    await expect(nav.getByRole('link', { name: t('menu.settings') })).toBeVisible()
    await expect(nav.getByRole('link', { name: t('menu.users') })).toHaveCount(0)

    await page.goto('/users')
    await expect(page).toHaveURL(/\/$/)
    await expect(pageTitle(page, 'menu.home')).toBeVisible()
  })

  test('an admin sees User Management', async ({ page, adminApi }) => {
    const admin = await adminApi.createUser({ role: 'admin' })
    await loginAs(page, admin.username, admin.password)
    await page.getByRole('navigation').getByRole('link', { name: t('menu.users') }).click()
    await expect(pageTitle(page, 'menu.users')).toBeVisible()
  })
})

test.describe('settings', () => {
  test('shows the signed-in account', async ({ page, adminApi }) => {
    const user = await adminApi.createUser()
    await loginAs(page, user.username, user.password)
    await page.getByRole('navigation').getByRole('link', { name: t('menu.settings') }).click()
    await expect(page.getByText(t('settings.signedInAs'))).toContainText(user.displayName)
    await expect(page.getByText(t('settings.signedInAs'))).toContainText(`(${user.username})`)
  })

  test('changes the password with validation', async ({ page, adminApi }) => {
    const user = await adminApi.createUser()
    await loginAs(page, user.username, user.password)
    await page.goto('/settings')

    const current = field(page, t('password.current'))
    const next = field(page, t('password.new'))
    const confirm = field(page, t('password.confirm'))
    const submit = page.getByRole('button', { name: t('password.submit') })
    const message = page.getByRole('alert')

    // Too short (checked in the browser)
    await current.fill(user.password)
    await next.fill('short')
    await confirm.fill('short')
    await submit.click()
    await expect(message).toHaveText(t('error.password_too_short'))

    // Confirmation does not match
    await next.fill('a-long-enough-password')
    await confirm.fill('a-different-password')
    await submit.click()
    await expect(message).toHaveText(t('error.password_mismatch'))

    // Wrong current password (checked by the server)
    await current.fill('not-my-current-password')
    await confirm.fill('a-long-enough-password')
    await submit.click()
    await expect(message).toHaveText(t('error.invalid_current_password'))

    // Success
    await current.fill(user.password)
    await next.fill('a-long-enough-password')
    await confirm.fill('a-long-enough-password')
    await submit.click()
    await expect(message).toHaveText(t('password.changed'))
    await expect(current).toHaveValue('')

    expect(await apiLoginStatus(user.username, 'a-long-enough-password')).toBe(200)
    expect(await apiLoginStatus(user.username, user.password)).toBe(401)
  })
})
