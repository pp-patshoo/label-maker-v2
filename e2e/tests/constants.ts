/**
 * Ports differ from the normal dev servers (3000/5173) so both can run at once.
 * Override with E2E_BACKEND_PORT / E2E_FRONTEND_PORT if Windows has reserved them
 * (check: netsh int ipv4 show excludedportrange protocol=tcp; Hyper-V reserves random ranges).
 */
export const BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT ?? 3901)
export const FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT ?? 5174)
export const BASE_URL = `http://localhost:${FRONTEND_PORT}`

/**
 * First admin, created by the backend on start (bootstrap.ts) in the throwaway
 * labelmaker_e2e database. The setup project changes the temporary password to `password`.
 */
export const ADMIN = {
  username: 'e2eadmin',
  displayName: 'E2E Admin',
  tempPassword: 'e2e-bootstrap-temp-1',
  password: 'e2e-admin-password-1',
}

/** Saved signed-in admin session (cookie + localStorage), reused by specs that start signed in. */
export const ADMIN_STATE = '.auth/admin.json'
