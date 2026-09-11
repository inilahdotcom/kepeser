import { useDb } from '../../../db/client'
import { ticketEvents } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = Number(getRouterParam(event, 'id'))
  const { note } = await readValid(event, commentSchema)
  const ticket = await getTicketOr404(id)
  if (ticket.archivedAt)
    throw createError({
      statusCode: 409,
      statusMessage: 'Tiket ini sudah diarsipkan. Pulihkan dulu sebelum diubah.',
    })

  return useDb()
    .insert(ticketEvents)
    .values({ ticketId: id, actorId: user.id, type: 'comment', note })
    .returning()
    .get()
})
