import type { H3Event } from 'h3'
import type { Role } from '../db/schema'

export type SessionUser = {
  id: number
  name: string
  email: string
  role: Role
  jobTitle: string
}

/** Kebenaran ada di server. Middleware client hanya untuk UX. */
export async function requireUser(event: H3Event): Promise<SessionUser> {
  const { user } = await requireUserSession(event)
  return user as SessionUser
}

export async function requireRole(event: H3Event, role: Role): Promise<SessionUser> {
  const user = await requireUser(event)
  if (user.role !== role)
    throw createError({ statusCode: 403, statusMessage: 'Akses ditolak.' })
  return user
}
