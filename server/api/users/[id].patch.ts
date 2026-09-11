import { eq } from 'drizzle-orm'
import { useDb } from '../../db/client'
import { users } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, 'supervisor')
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValid(event, updateUserSchema)

  // Supervisor tidak bisa mengunci dirinya sendiri keluar dari sistem.
  if (id === actor.id && ((body.status && body.status !== 'active') || body.role === 'staff'))
    throw createError({
      statusCode: 400,
      statusMessage: 'Tidak bisa menonaktifkan atau menurunkan akun sendiri.',
    })

  const patch: Partial<typeof users.$inferInsert> = {}
  if (body.name) patch.name = body.name
  if (body.role) patch.role = body.role
  if (body.jobTitle) patch.jobTitle = body.jobTitle
  if (body.status) patch.status = body.status
  if (body.password) patch.passwordHash = await hashPassword(body.password)

  if (!Object.keys(patch).length)
    throw createError({ statusCode: 400, statusMessage: 'Tidak ada yang diubah.' })

  const row = useDb()
    .update(users)
    .set(patch)
    .where(eq(users.id, id))
    .returning({ id: users.id, name: users.name, status: users.status })
    .get()
  if (!row) throw createError({ statusCode: 404, statusMessage: 'User tidak ditemukan.' })
  return row
})
