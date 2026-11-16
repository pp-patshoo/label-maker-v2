import pg from 'pg'
import { createDb, runMigrations } from '../src/db/client.js'
import { testDatabaseUrl } from './testDb.js'

/** Recreate the test database and apply migrations once per test run. */
export default async function setup() {
  const url = new URL(testDatabaseUrl())
  const dbName = url.pathname.slice(1)
  if (!/^[a-z0-9_]+$/.test(dbName) || !dbName.endsWith('_test')) {
    throw new Error(`Refusing to recreate non-test database "${dbName}"`)
  }

  const adminUrl = new URL(url)
  adminUrl.pathname = '/postgres'
  const admin = new pg.Client({ connectionString: adminUrl.toString() })
  await admin.connect()
  await admin.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`)
  await admin.query(`CREATE DATABASE ${dbName}`)
  await admin.end()

  const { db, pool } = createDb(url.toString())
  await runMigrations(db)
  await pool.end()
}
