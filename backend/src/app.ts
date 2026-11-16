import Fastify from 'fastify'
import type { FastifyError, FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import { sql } from 'drizzle-orm'
import { registerAuthHooks } from './auth/guards.js'
import { authRoutes } from './auth/routes.js'
import type { Config } from './config.js'
import type { Db } from './db/client.js'
import { HttpError } from './errors.js'
import { userRoutes } from './users/routes.js'

export interface BuildAppOptions {
  config: Config
  db: Db
  logger?: boolean
}

export async function buildApp({ config, db, logger = true }: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: logger ? { level: config.logLevel } : false,
    // Only reachable through nginx (internal network) or the Vite dev proxy, so trust X-Forwarded-For.
    trustProxy: true,
    bodyLimit: 64 * 1024,
  })

  app.setErrorHandler((err: FastifyError | HttpError | (Error & { statusCode?: number }), req, reply) => {
    if (err instanceof HttpError) {
      return reply.status(err.statusCode).send({ error: err.code, ...err.extra })
    }
    const status = err.statusCode ?? 500
    if (status === 429) {
      // Thrown by @fastify/rate-limit (see errorResponseBuilder below)
      const retryAfter = (err as { retryAfter?: number }).retryAfter
      return reply.status(429).send({ error: 'too_many_attempts', retryAfter })
    }
    if (status < 500) return reply.status(status).send({ error: 'invalid_request' })
    req.log.error(err)
    return reply.status(500).send({ error: 'internal_error' })
  })

  app.setNotFoundHandler((_req, reply) => reply.status(404).send({ error: 'not_found' }))

  await app.register(cookie)
  await app.register(rateLimit, {
    global: false,
    hook: 'preHandler', // run after body parsing so onExceeded can log the attempted username
    errorResponseBuilder: (_req, ctx) => {
      const e = new Error('too_many_attempts') as Error & { statusCode: number; retryAfter: number }
      e.statusCode = 429
      e.retryAfter = Math.ceil(ctx.ttl / 1000)
      return e
    },
  })

  registerAuthHooks(app, db, config.allowedOrigins)

  await app.register(
    async (api) => {
      // logLevel 'warn': the Docker healthcheck calls this every 10s, keep it out of the logs
      api.get('/health', { logLevel: 'warn' }, async () => {
        await db.execute(sql`select 1`)
        return { status: 'ok' }
      })
      await api.register(authRoutes, { db, config })
      await api.register(userRoutes, { db })
    },
    { prefix: '/api' },
  )

  return app
}
