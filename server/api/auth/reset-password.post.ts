import { and, eq, isNull, ne } from 'drizzle-orm'
import { useDb } from '../../db/client'
import { passwordResets, users } from '../../db/schema'
import { hashResetToken, resetTokenState } from '../../domain/reset-token'

const PESAN = {
  expired: 'Tautan reset sudah kedaluwarsa. Silakan minta tautan baru.',
  used: 'Tautan reset ini sudah dipakai. Silakan minta tautan baru.',
  unknown: 'Tautan reset tidak valid. Silakan minta tautan baru.',
} as const

/** Pakai token, set password baru. Publik — tokennya yang jadi bukti identitas. */
export default defineEventHandler(async (event) => {
  rateLimit(event, 'reset', 10, 20)
  const { token, password } = await readValid(event, resetPasswordSchema)
  const db = useDb()
  const now = nowSec()

  const [row] = await db
    .select()
    .from(passwordResets)
    .where(eq(passwordResets.tokenHash, hashResetToken(token)))
    .limit(1)

  const state = resetTokenState(row, now)
  if (state !== 'valid') throw createError({ statusCode: 400, statusMessage: PESAN[state] })

  const [user] = await db.select().from(users).where(eq(users.id, row!.userId)).limit(1)
  // Status bisa berubah setelah tautan terbit — periksa lagi saat dipakai.
  if (!user || user.status !== 'active')
    throw createError({ statusCode: 400, statusMessage: PESAN.unknown })

  const passwordHash = await hashPassword(password)

  db.transaction((tx) => {
    tx.update(users).set({ passwordHash }).where(eq(users.id, user.id)).run()
    tx.update(passwordResets)
      .set({ usedAt: now })
      .where(eq(passwordResets.id, row!.id))
      .run()
    // Tautan lain milik user ini ikut hangus.
    tx.delete(passwordResets)
      .where(
        and(
          eq(passwordResets.userId, user.id),
          ne(passwordResets.id, row!.id),
          isNull(passwordResets.usedAt),
        ),
      )
      .run()
  })

  return { ok: true }
})
