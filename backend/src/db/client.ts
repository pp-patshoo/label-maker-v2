import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/node-postgres'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'
import * as schema from './schema.js'

export type Db = NodePgDatabase<typeof schema>

export function createDb(databaseUrl: string): { db: Db; pool: pg.Pool } {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 10 })
  const db = drizzle(pool, { schema })
  return { db, pool }
}

/** backend/drizzle (works from both src/db and dist/db). */
const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url))

export async function runMigrations(db: Db): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })
}
