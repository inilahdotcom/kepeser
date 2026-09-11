import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

export type DB = BetterSQLite3Database<typeof schema>

let cached: { db: DB; sqlite: Database.Database } | null = null

/**
 * better-sqlite3, bukan bun:sqlite: dev server Nuxt memuat handler lewat ESM loader
 * Node yang tidak mengenal skema `bun:`. better-sqlite3 jalan di Node maupun Bun,
 * jadi runtime dev dan produksi memakai driver yang sama.
 */
export function openDb(url = process.env.DATABASE_URL || './data/kepeser.db') {
  if (cached) return cached
  const sqlite = new Database(url)
  // WAL: banyak pembaca berdampingan dengan satu penulis — persis bentuk beban aplikasi ini.
  // busy_timeout menahan tulisan yang terkunci selama 5s alih-alih langsung gagal.
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('busy_timeout = 5000')
  sqlite.pragma('foreign_keys = ON')
  cached = { db: drizzle(sqlite, { schema }), sqlite }
  return cached
}

export function useDb(): DB {
  return openDb().db
}

export function closeDb() {
  cached?.sqlite.close()
  cached = null
}
