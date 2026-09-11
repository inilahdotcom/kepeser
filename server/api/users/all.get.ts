import { useDb } from '../../db/client'
import { users } from '../../db/schema'

/** Termasuk yang nonaktif — halaman admin. */
export default defineEventHandler(async (event) => {
  await requireRole(event, 'supervisor')
  return useDb()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      jobTitle: users.jobTitle,
      status: users.status,
      createdAt: users.createdAt,
    })
    .from(users)
})
