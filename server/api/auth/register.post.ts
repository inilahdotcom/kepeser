import { useDb } from '../../db/client'
import { users } from '../../db/schema'
import { emailDomainAllowed } from '../../domain/email'

/**
 * Pendaftaran mandiri staff IT — publik, tanpa login.
 *
 * Akunnya dibuat berstatus 'pending' dan belum bisa dipakai sampai supervisor
 * menyetujuinya di /admin/users.
 */
export default defineEventHandler(async (event) => {
  // Lebih ketat dari /api/issues: membuat akun harus lebih mahal daripada melapor.
  rateLimit(event, 'register', 3, 5)

  const body = await readValid(event, registerSchema)

  const allowed = process.env.ALLOWED_EMAIL_DOMAIN
  if (!emailDomainAllowed(body.email, allowed))
    throw createError({
      statusCode: 400,
      statusMessage: `Gunakan email @${allowed} untuk mendaftar.`,
    })

  try {
    useDb()
      .insert(users)
      .values({
        email: body.email,
        name: body.name,
        jobTitle: body.jobTitle,
        passwordHash: await hashPassword(body.password),
        // Keduanya ditentukan di sini, tidak pernah dibaca dari body.
        role: 'staff',
        status: 'pending',
      })
      .run()
  } catch (e) {
    if (String(e).includes('UNIQUE'))
      throw createError({
        statusCode: 409,
        statusMessage: 'Email ini sudah terdaftar. Hubungi supervisor IT kalau lupa password.',
      })
    throw e
  }

  // Tidak mengembalikan id/apa pun soal baris yang dibuat — belum ada yang berhak melihatnya.
  return { ok: true }
})
