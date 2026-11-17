import { th } from '../../frontend/src/i18n/th'
import { ADMIN_STATE } from './constants'
import { expect, pageTitle, t, test } from './fixtures'

test.use({ storageState: ADMIN_STATE })

test.describe('layout', () => {
  test('sidebar collapses and stays collapsed after reload', async ({ page }) => {
    await page.goto('/')
    const sidebar = page.locator('aside')
    await expect(sidebar).toHaveAttribute('data-collapsed', 'false')

    await page.getByRole('button', { name: t('sidebar.collapse') }).click()
    await expect(sidebar).toHaveAttribute('data-collapsed', 'true')
    // Menu still usable by icon (label moves to aria-label/tooltip)
    await expect(page.getByRole('link', { name: t('menu.settings') })).toBeVisible()

    await page.reload()
    await expect(sidebar).toHaveAttribute('data-collapsed', 'true')
    await page.getByRole('button', { name: t('sidebar.expand') }).click()
    await expect(sidebar).toHaveAttribute('data-collapsed', 'false')
  })

  test('switches language and remembers it', async ({ page }) => {
    await page.goto('/')
    await expect(pageTitle(page, 'menu.home')).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')

    const language = page.getByRole('group', { name: t('sidebar.language') })
    await language.getByRole('button', { name: 'TH' }).click()
    await expect(page.getByRole('heading', { level: 1, name: th['menu.home'] })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'th')

    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: th['menu.home'] })).toBeVisible()
    await page.getByRole('group', { name: th['sidebar.language'] }).getByRole('button', { name: 'EN' }).click()
    await expect(pageTitle(page, 'menu.home')).toBeVisible()
  })

  test('menu items open the right page and show which one is active', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation')
    const pages = [
      { key: 'menu.sample', path: /\/sample$/ },
      { key: 'menu.users', path: /\/users$/ },
      { key: 'menu.settings', path: /\/settings$/ },
      { key: 'menu.home', path: /\/$/ },
    ] as const
    for (const p of pages) {
      const link = nav.getByRole('link', { name: t(p.key) })
      await link.click()
      await expect(page).toHaveURL(p.path)
      await expect(pageTitle(page, p.key)).toBeVisible()
      await expect(link).toHaveAttribute('aria-current', 'page')
    }
  })

  test('normal use produces no console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text())
    })
    page.on('pageerror', (e) => errors.push(String(e)))

    await page.goto('/')
    const nav = page.getByRole('navigation')
    for (const key of ['menu.sample', 'menu.users', 'menu.settings', 'menu.home'] as const) {
      await nav.getByRole('link', { name: t(key) }).click()
      await expect(pageTitle(page, key)).toBeVisible()
    }
    await nav.getByRole('link', { name: t('menu.users') }).click()
    await page.getByRole('tab', { name: t('users.tab.history') }).click()
    await expect(page.getByRole('table')).toBeVisible()

    expect(errors).toEqual([])
  })
})
