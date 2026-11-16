import type { UserRow } from '../db/schema.js'

/** Shape of the current user returned to the frontend (never includes the hash). */
export function toPublicUser(u: UserRow) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    role: u.role,
    mustChangePassword: u.mustChangePassword,
  }
}
