import { eq } from 'drizzle-orm'
import { useDb } from '../../db/client'
import { users } from '../../db/schema'

/**
 * Ganti password sendiri. Password lama WAJIB — tanpa itu, laptop yang ditinggal
 * terbuka cukup untuk membajak akun secara permanen.
 */
export default defineEventHandler(async (event) => {
  const sesi = await requireUser(event)
  const { currentPassword, newPassword } = await readValid(event, changePasswordSchema)
  const db = useDb()

  const [user] = await db.select().from(users).where(eq(users.id, sesi.id)).limit(1)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Sesi tidak valid.' })

  if (!(await verifyPassword(user.passwordHash, currentPassword)))
    throw createError({ statusCode: 401, statusMessage: 'Password saat ini salah.' })

  if (await verifyPassword(user.passwordHash, newPassword))
    throw createError({
      statusCode: 400,
      statusMessage: 'Password baru harus berbeda dari password sekarang.',
    })

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword) })
    .where(eq(users.id, user.id))

  return { ok: true }
})
