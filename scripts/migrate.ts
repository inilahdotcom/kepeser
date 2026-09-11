import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

// Sengaja berdiri sendiri — tidak mengimpor apa pun dari server/ supaya bisa
// dijalankan Node langsung (dan di Docker) tanpa build step.
const url = process.env.DATABASE_URL || './data/kepeser.db'
const sqlite = new Database(url)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')
migrate(drizzle(sqlite), { migrationsFolder: './migrations' })
sqlite.close()
console.log(`migrasi selesai → ${url}`)
