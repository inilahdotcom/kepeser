import type { Config } from 'drizzle-kit'

export default {
  schema: './server/db/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
  dbCredentials: { url: process.env.DATABASE_URL ?? './data/kepeser.db' },
  strict: true,
} satisfies Config
