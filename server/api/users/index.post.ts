import { useDb } from '../../db/client'
import { users } from '../../db/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, 'supervisor')
  const body = await readValid(event, createUserSchema)

  try {
    return useDb()
      .insert(users)
      .values({
        email: body.email,
        name: body.name,
        role: body.role,
        // Dibuat supervisor = langsung aktif; default kolom 'pending' hanya untuk
        // pendaftaran mandiri lewat /api/auth/register.
        status: 'active',
        jobTitle: body.jobTitle,
        passwordHash: await hashPassword(body.password),
      })
      .returning({ id: users.id, email: users.email, name: users.name })
      .get()
  } catch (e) {
    if (String(e).includes('UNIQUE'))
      throw createError({ statusCode: 409, statusMessage: 'Email sudah terdaftar.' })
    throw e
  }
})
