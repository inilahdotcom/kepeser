import { eq } from 'drizzle-orm'
import { useDb } from '../../db/client'
import { users } from '../../db/schema'

/** Hanya staff AKTIF — dipakai dropdown assign. Akun pending tidak boleh
 *  bisa di-assign pekerjaan. Tanpa password_hash. */
export default defineEventHandler(async (event) => {
  await requireUser(event)
  return useDb()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      jobTitle: users.jobTitle,
      status: users.status,
    })
    .from(users)
    .where(eq(users.status, 'active'))
})
