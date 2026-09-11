import { sql } from 'drizzle-orm'
import { useDb } from '../db/client'
import { users } from '../db/schema'

/**
 * Akun supervisor pertama. Tanpa ini sistem terkunci — tidak ada yang bisa
 * approve apa pun. Idempoten: hanya jalan kalau tabel users masih kosong.
 */
export default defineNitroPlugin(async () => {
  const email = process.env.SEED_SUPERVISOR_EMAIL
  const password = process.env.SEED_SUPERVISOR_PASSWORD
  if (!email || !password) return

  try {
    const db = useDb()
    const [row] = await db.select({ n: sql<number>`count(*)` }).from(users)
    if (!row) return
    if (row.n > 0) {
      // Gagal diam-diam itu jebakan: mengubah SEED_SUPERVISOR_PASSWORD di .env
      // terlihat seperti seharusnya berlaku, padahal tidak. Katakan terus terang.
      console.log(
        `[seed] dilewati — sudah ada ${row.n} user. Password di .env TIDAK dipakai lagi; ` +
          `reset lewat /admin/users.`,
      )
      return
    }

    await db.insert(users).values({
      email: email.toLowerCase(),
      name: process.env.SEED_SUPERVISOR_NAME || 'IT Supervisor',
      role: 'supervisor',
      status: 'active',
      jobTitle: 'supervisor',
      passwordHash: await hashPassword(password),
    })
    console.log(`[seed] akun supervisor dibuat: ${email}`)
  } catch (e) {
    console.error('[seed] gagal — sudah jalan `bun run db:migrate`?', e)
  }
})
