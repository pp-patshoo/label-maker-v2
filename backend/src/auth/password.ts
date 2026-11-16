import { randomBytes } from 'node:crypto'
import { hash, verify } from '@node-rs/argon2'

/** OWASP-recommended Argon2id parameters (m=19 MiB, t=2, p=1). */
const ARGON2_OPTIONS = {
  algorithm: 2, // Algorithm.Argon2id (const enum can't be imported with verbatimModuleSyntax)
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const

export const PASSWORD_MIN_LENGTH = 10
export const PASSWORD_MAX_LENGTH = 128

export type PasswordIssue =
  | 'password_too_short'
  | 'password_too_long'
  | 'password_same_as_username'

/** Length-based policy (NIST SP 800-63B): no composition rules. */
export function validatePassword(password: string, username: string): PasswordIssue | null {
  const length = [...password].length // count code points, not UTF-16 units
  if (length < PASSWORD_MIN_LENGTH) return 'password_too_short'
  if (length > PASSWORD_MAX_LENGTH) return 'password_too_long'
  if (password.trim().toLowerCase() === username.trim().toLowerCase()) {
    return 'password_same_as_username'
  }
  return null
}

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS)
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password)
  } catch {
    return false
  }
}

let dummyHash: Promise<string> | null = null

/**
 * Run a verification that always fails, so a login for an unknown username
 * takes about as long as one for a real user (prevents username probing by timing).
 */
export async function verifyAgainstDummy(password: string): Promise<void> {
  dummyHash ??= hashPassword(randomBytes(16).toString('hex'))
  await verifyPassword(await dummyHash, password)
}
