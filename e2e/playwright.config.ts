import { defineConfig, devices } from '@playwright/test'
import { ADMIN, BACKEND_PORT, BASE_URL, FRONTEND_PORT } from './tests/constants'

/**
 * Self-contained E2E run: starts its own backend (throwaway DB labelmaker_e2e) and Vite dev server
 * on ports 3100/5174, so it never touches real data and can run next to the normal dev servers.
 * Needs the dev PostgreSQL running (docker compose -f docker-compose.yml -f compose.dev.yml up -d db).
 */
export default defineConfig({
  testDir: 'tests',
  fullyParallel: false,
  workers: 1, // one shared database
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: BASE_URL,
    channel: 'msedge',
    viewport: { width: 1280, height: 720 }, // minimum supported window size
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /global\.setup\.ts/ },
    {
      name: 'msedge',
      use: { ...devices['Desktop Edge'], channel: 'msedge', viewport: { width: 1280, height: 720 } },
      dependencies: ['setup'],
    },
  ],
  webServer: [
    {
      command: 'node scripts/start-backend.mjs',
      url: `http://localhost:${BACKEND_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        PORT: String(BACKEND_PORT),
        HOST: '127.0.0.1',
        APP_ORIGIN: BASE_URL,
        COOKIE_SECURE: 'false',
        LOGIN_RATE_LIMIT_MAX: '1000', // the per-IP limit would otherwise trip during the run
        ADMIN_USERNAME: ADMIN.username,
        ADMIN_PASSWORD: ADMIN.tempPassword,
        ADMIN_DISPLAY_NAME: ADMIN.displayName,
      },
    },
    {
      command: `npx vite --port ${FRONTEND_PORT} --strictPort`,
      cwd: '../frontend',
      url: BASE_URL,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { API_PROXY_TARGET: `http://localhost:${BACKEND_PORT}` },
    },
  ],
})
