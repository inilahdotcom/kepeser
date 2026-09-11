import { eq } from 'drizzle-orm'
import { useDb } from '../../db/client'
import { users } from '../../db/schema'

export default defineEventHandler(async (event) => {
  rateLimit(event, 'login', 5, 8)
  const { email, password } = await readValid(event, loginSchema)
  const db = useDb()

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

  // Pesan sama untuk email tidak ada / password salah / akun nonaktif —
  // jangan bocorkan email mana yang terdaftar.
  const bad = () =>
    createError({ statusCode: 401, statusMessage: 'Email atau password salah.' })

  if (!user) {
    // Tetap bakar waktu hashing supaya email terdaftar vs tidak tidak bisa
    // dibedakan lewat timing.
    await hashPassword(password)
    throw bad()
  }

  // Password DULU, baru status. Urutan ini yang membuat pesan spesifik di bawah
  // aman: untuk melihatnya, orang itu sudah harus tahu passwordnya.
  if (!(await verifyPassword(user.passwordHash, password))) throw bad()

  if (user.status === 'pending')
    throw createError({
      statusCode: 403,
      statusMessage:
        'Akun Anda menunggu persetujuan supervisor IT. Coba lagi setelah disetujui.',
    })
  if (user.status !== 'active') throw bad()

  await setUserSession(event, {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      jobTitle: user.jobTitle,
    },
  })
  return { ok: true }
})
