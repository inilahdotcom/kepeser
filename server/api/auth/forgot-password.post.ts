import { and, eq, isNull } from 'drizzle-orm'
import { useDb } from '../../db/client'
import { passwordResets, users } from '../../db/schema'
import { makeResetToken, RESET_TTL_SEC } from '../../domain/reset-token'

/**
 * Minta tautan reset. Publik.
 *
 * Responsnya SELALU sama apa pun yang terjadi — kalau berbeda, endpoint ini jadi
 * alat untuk memetakan email siapa saja yang terdaftar.
 */
export default defineEventHandler(async (event) => {
  rateLimit(event, 'forgot', 3, 5)
  const { email } = await readValid(event, forgotPasswordSchema)
  const db = useDb()

  const jawaban = {
    ok: true,
    message:
      'Kalau email tersebut terdaftar, tautan reset sudah dikirim. Cek kotak masuk dan folder spam.',
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

  // Hanya akun aktif. Akun 'pending' belum pernah disetujui dan 'disabled' itu
  // mantan karyawan — keduanya tidak boleh punya jalan masuk kembali.
  if (!user || user.status !== 'active') return jawaban

  const { token, tokenHash } = makeResetToken()
  const now = nowSec()

  db.transaction((tx) => {
    // Permintaan baru membatalkan yang lama: hanya boleh ada satu tautan hidup.
    tx.delete(passwordResets)
      .where(and(eq(passwordResets.userId, user.id), isNull(passwordResets.usedAt)))
      .run()
    tx.insert(passwordResets)
      .values({ userId: user.id, tokenHash, expiresAt: now + RESET_TTL_SEC })
      .run()
  })

  const { subject, text } = resetPasswordEmail(user.name, token)
  try {
    await sendMail(user.email, subject, text)
  } catch (e) {
    // Jangan bocorkan kegagalan ke pemanggil — itu membocorkan bahwa emailnya ada.
    console.error('[forgot-password] gagal mengirim email:', e)
  }

  return jawaban
})
