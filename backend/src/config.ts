import { z } from 'zod'

const bool = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1')

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().url(),
  /** Comma-separated list of origins allowed to make state-changing requests. */
  APP_ORIGIN: z.string().min(1),
  COOKIE_SECURE: bool.default(false),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  ADMIN_USERNAME: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  ADMIN_DISPLAY_NAME: z.string().optional(),
})

export interface Config {
  env: 'development' | 'production' | 'test'
  host: string
  port: number
  logLevel: string
  databaseUrl: string
  allowedOrigins: string[]
  cookieSecure: boolean
  loginRateLimitMax: number
  admin: { username?: string; password?: string; displayName?: string }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Invalid environment configuration:\n${issues}`)
  }
  const e = parsed.data
  return {
    env: e.NODE_ENV,
    host: e.HOST,
    port: e.PORT,
    logLevel: e.LOG_LEVEL,
    databaseUrl: e.DATABASE_URL,
    allowedOrigins: e.APP_ORIGIN.split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean),
    cookieSecure: e.COOKIE_SECURE,
    loginRateLimitMax: e.LOGIN_RATE_LIMIT_MAX,
    admin: {
      username: e.ADMIN_USERNAME,
      password: e.ADMIN_PASSWORD,
      displayName: e.ADMIN_DISPLAY_NAME,
    },
  }
}
