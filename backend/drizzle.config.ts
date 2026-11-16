import { defineConfig } from 'drizzle-kit'

// Used only by `npm run db:generate` to create SQL migrations from src/db/schema.ts.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
})
