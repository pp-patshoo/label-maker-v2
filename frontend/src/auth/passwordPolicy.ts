/**
 * Same rules as backend/src/auth/password.ts, used only for instant feedback.
 * The backend is the source of truth.
 */
export const PASSWORD_MIN_LENGTH = 10
export const PASSWORD_MAX_LENGTH = 128

export type PasswordIssue = 'password_too_short' | 'password_too_long' | 'password_same_as_username'

export function checkPassword(password: string, username: string): PasswordIssue | null {
  const length = [...password].length
  if (length < PASSWORD_MIN_LENGTH) return 'password_too_short'
  if (length > PASSWORD_MAX_LENGTH) return 'password_too_long'
  if (password.trim().toLowerCase() === username.trim().toLowerCase()) return 'password_same_as_username'
  return null
}

/** Random temporary password for admins to hand out (no ambiguous characters like 0/O, 1/l). */
export function generateTempPassword(length = 14): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint32Array(length))
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}
