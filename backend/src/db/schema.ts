import {
  bigserial,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

const tstz = (name: string) => timestamp(name, { withTimezone: true })

export const userRole = pgEnum('user_role', ['admin', 'user'])
export type UserRole = (typeof userRole.enumValues)[number]

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Always stored lowercase. */
  username: text('username').notNull().unique(),
  displayName: text('display_name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: userRole('role').notNull().default('user'),
  mustChangePassword: boolean('must_change_password').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  failedAttempts: integer('failed_attempts').notNull().default(0),
  lockedUntil: tstz('locked_until'),
  passwordChangedAt: tstz('password_changed_at').notNull().defaultNow(),
  createdAt: tstz('created_at').notNull().defaultNow(),
  updatedAt: tstz('updated_at').notNull().defaultNow(),
})

export const sessions = pgTable(
  'sessions',
  {
    /** SHA-256 (hex) of the session token. The raw token only lives in the browser cookie. */
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: tstz('created_at').notNull().defaultNow(),
    lastSeenAt: tstz('last_seen_at').notNull().defaultNow(),
    expiresAt: tstz('expires_at').notNull(),
    ip: text('ip'),
    userAgent: text('user_agent'),
  },
  (t) => [index('sessions_user_id_idx').on(t.userId)],
)

export const loginEvents = pgTable(
  'login_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    usernameAttempted: text('username_attempted').notNull(),
    success: boolean('success').notNull(),
    /** ok | invalid | locked | inactive | rate_limited */
    reason: text('reason').notNull(),
    ip: text('ip'),
    userAgent: text('user_agent'),
    createdAt: tstz('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('login_events_created_at_idx').on(t.createdAt.desc()),
    index('login_events_user_id_idx').on(t.userId),
  ],
)

export type UserRow = typeof users.$inferSelect
