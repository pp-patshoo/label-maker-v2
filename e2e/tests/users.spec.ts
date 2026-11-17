import { ADMIN, ADMIN_STATE } from './constants'
import { apiLoginStatus, expect, field, pageTitle, submitLogin, t, test, uniqueName, userRow } from './fixtures'
import type { Locator, Page } from '@playwright/test'
import type { TranslationKey } from '../../frontend/src/i18n/en'

test.use({ storageState: ADMIN_STATE })

async function openUsers(page: Page) {
  await page.goto('/users')
  await expect(pageTitle(page, 'menu.users')).toBeVisible()
}

function badge(_page: Page, row: Locator, key: TranslationKey) {
  return row.getByText(t(key), { exact: true })
}

test.describe('user management', () => {
  test('creates a user who must change the temporary password', async ({ page, browser }) => {
    await openUsers(page)
    await page.getByRole('button', { name: t('users.add') }).click()
    const dialog = page.getByRole('dialog', { name: t('users.dialog.create') })
    await expect(dialog).toBeVisible()

    const username = uniqueName('new')
    await field(dialog, t('users.field.username')).fill(username)
    await field(dialog, t('users.field.displayName')).fill('Brand New')
    const tempPassword = await field(dialog, t('users.field.tempPassword')).inputValue()
    expect(tempPassword.length).toBeGreaterThanOrEqual(10) // pre-filled with a generated password
    await dialog.getByRole('button', { name: t('common.save') }).click()
    await expect(dialog).toBeHidden()

    const row = userRow(page, username)
    await expect(row).toContainText('Brand New')
    await expect(badge(page, row, 'role.user')).toBeVisible()
    await expect(badge(page, row, 'users.status.mustChange')).toBeVisible()
    await expect(row).toContainText(t('users.never'))

    // The new user signs in with the temporary password and is asked to change it
    // Empty storage: otherwise the context inherits the admin session from test.use()
    const other = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    await other.addInitScript(() => localStorage.setItem('lang', 'en'))
    const userPage = await other.newPage()
    await userPage.goto('/login')
    await submitLogin(userPage, username, tempPassword)
    await expect(userPage).toHaveURL(/\/change-password$/)
    await other.close()
  })

  test('rejects a username that is already taken', async ({ page, adminApi }) => {
    const existing = await adminApi.createUser()
    await openUsers(page)
    await page.getByRole('button', { name: t('users.add') }).click()
    const dialog = page.getByRole('dialog', { name: t('users.dialog.create') })
    await field(dialog, t('users.field.username')).fill(existing.username)
    await field(dialog, t('users.field.displayName')).fill('Duplicate')
    await dialog.getByRole('button', { name: t('common.save') }).click()
    await expect(dialog.getByRole('alert')).toHaveText(t('error.username_taken'))
  })

  test('edits display name and role', async ({ page, adminApi }) => {
    const user = await adminApi.createUser()
    await openUsers(page)
    const row = userRow(page, user.username)
    await row.getByRole('button', { name: t('users.action.edit') }).click()

    const dialog = page.getByRole('dialog', { name: t('users.dialog.edit') })
    await expect(field(dialog, t('users.field.username'))).toBeDisabled()
    await field(dialog, t('users.field.displayName')).fill('Renamed Person')
    await field(dialog, t('users.field.role')).selectOption('admin')
    await dialog.getByRole('button', { name: t('common.save') }).click()
    await expect(dialog).toBeHidden()

    await expect(row).toContainText('Renamed Person')
    await expect(badge(page, row, 'role.admin')).toBeVisible()
  })

  test('resets a password: old one stops working, new one is temporary', async ({ page, adminApi }) => {
    const user = await adminApi.createUser()
    await openUsers(page)
    const row = userRow(page, user.username)
    await row.getByRole('button', { name: t('users.action.resetPassword') }).click()

    const dialog = page.getByRole('dialog', { name: t('users.dialog.reset', { name: user.displayName }) })
    const tempPassword = 'fresh-temporary-pass'
    await field(dialog, t('users.field.tempPassword')).fill(tempPassword)
    await dialog.getByRole('button', { name: t('common.save') }).click()
    await expect(dialog).toBeHidden()

    await expect(badge(page, row, 'users.status.mustChange')).toBeVisible()
    expect(await apiLoginStatus(user.username, user.password)).toBe(401)
    expect(await apiLoginStatus(user.username, tempPassword)).toBe(200)
  })

  test('disables (with confirmation) and re-enables an account', async ({ page, adminApi }) => {
    const user = await adminApi.createUser()
    await openUsers(page)
    const row = userRow(page, user.username)

    await row.getByRole('button', { name: t('users.action.deactivate') }).click()
    const confirm = page.getByRole('dialog', { name: t('users.confirm.title') })
    await expect(confirm).toContainText(t('users.confirm.deactivate', { name: user.displayName }))
    await confirm.getByRole('button', { name: t('users.action.deactivate') }).click()
    await expect(confirm).toBeHidden()
    await expect(badge(page, row, 'users.status.inactive')).toBeVisible()
    expect(await apiLoginStatus(user.username, user.password)).toBe(401)

    await row.getByRole('button', { name: t('users.action.activate') }).click()
    await expect(badge(page, row, 'users.status.active')).toBeVisible()
    expect(await apiLoginStatus(user.username, user.password)).toBe(200)
  })

  test('unlocks a locked account', async ({ page, adminApi }) => {
    const user = await adminApi.createUser()
    await adminApi.lock(user.username)
    await openUsers(page)
    const row = userRow(page, user.username)
    await expect(badge(page, row, 'users.status.locked')).toBeVisible()

    await row.getByRole('button', { name: t('users.action.unlock') }).click()
    await expect(badge(page, row, 'users.status.locked')).toBeHidden()
    await expect(row.getByRole('button', { name: t('users.action.unlock') })).toBeHidden()
    expect(await apiLoginStatus(user.username, user.password)).toBe(200)
  })

  test('cannot reset or disable your own account', async ({ page }) => {
    await openUsers(page)
    const row = userRow(page, ADMIN.username)
    await expect(row).toContainText(`(${t('users.you')})`)
    await expect(row.getByRole('button', { name: t('users.action.resetPassword') })).toBeDisabled()
    await expect(row.getByRole('button', { name: t('users.action.deactivate') })).toBeDisabled()
    await expect(row.getByRole('button', { name: t('users.action.edit') })).toBeEnabled()
  })
})

test.describe('login history', () => {
  test('shows successful and failed sign-ins', async ({ page, adminApi }) => {
    const user = await adminApi.createUser()
    await apiLoginStatus(user.username, 'wrong-password-x')
    await apiLoginStatus(user.username, user.password)

    await openUsers(page)
    await page.getByRole('tab', { name: t('users.tab.history') }).click()
    await expect(page.getByRole('tab', { name: t('users.tab.history') })).toHaveAttribute('aria-selected', 'true')

    const rows = page.getByRole('row').filter({ hasText: user.username })
    await expect(rows.filter({ hasText: t('history.reason.invalid') })).toHaveCount(1)
    // 2 successes: the one in createUser (changing the temporary password) and the one above
    await expect(rows.filter({ hasText: t('history.reason.ok') })).toHaveCount(2)
  })

  test('pages through more than 50 entries', async ({ page }) => {
    // Unknown usernames are logged too; 51 attempts guarantee a second page
    const name = uniqueName('ghost')
    for (let i = 0; i < 51; i++) await apiLoginStatus(name, 'nope-nope-nope')

    await openUsers(page)
    await page.getByRole('tab', { name: t('users.tab.history') }).click()
    const previous = page.getByRole('button', { name: t('common.previous') })
    const next = page.getByRole('button', { name: t('common.next') })

    await expect(page.getByText(/^1–50 of \d+$/)).toBeVisible()
    await expect(previous).toBeDisabled()
    await next.click()
    await expect(page.getByText(/^51–\d+ of \d+$/)).toBeVisible()
    await expect(previous).toBeEnabled()
    await previous.click()
    await expect(page.getByText(/^1–50 of \d+$/)).toBeVisible()
  })
})
