import { eq } from 'drizzle-orm'
import { useDb } from '../../../db/client'
import { users } from '../../../db/schema'
import { canTransition } from '../../../domain/transitions'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'supervisor')
  const id = Number(getRouterParam(event, 'id'))
  const { assigneeId, dueAt, priority } = await readValid(event, assignSchema)
  const ticket = await getTicketOr404(id)

  const check = canTransition(ticket, 'assign', user)
  if (!check.ok) throw createError({ statusCode: 409, statusMessage: check.reason })

  const [assignee] = await useDb().select().from(users).where(eq(users.id, assigneeId)).limit(1)
  if (!assignee || assignee.status !== 'active')
    throw createError({ statusCode: 400, statusMessage: 'Staff tidak ditemukan atau nonaktif.' })

  // Assign ulang saat sudah in_progress tidak melempar tiket mundur ke approved —
  // pekerjaan yang sudah jalan tetap jalan, hanya tangannya yang berpindah.
  const status = ticket.status === 'in_progress' ? 'in_progress' : check.next

  return applyChange(
    id,
    {
      assigneeId,
      status,
      assignedAt: ticket.assignedAt ?? nowSec(),
      dueAt: dueAt ?? ticket.dueAt,
      ...(priority ? { priority } : {}),
    },
    { type: 'assign', note: `Di-assign ke ${assignee.name}`, actorId: user.id },
  )
})
