import { useDb } from '../../db/client'
import { tickets } from '../../db/schema'

/** Edit isi tiket. Supervisor atau penanggung jawabnya — bukan sembarang staff. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'ID tidak valid.' })

  const body = await readValid(event, editTicketSchema)
  const ticket = await getTicketOr404(id)

  if (ticket.archivedAt)
    throw createError({
      statusCode: 409,
      statusMessage: 'Tiket ini sudah diarsipkan. Pulihkan dulu sebelum diubah.',
    })

  if (user.role !== 'supervisor' && ticket.assigneeId !== user.id)
    throw createError({
      statusCode: 403,
      statusMessage: 'Hanya supervisor atau penanggung jawab tiket ini yang bisa mengedit.',
    })

  // Catat apa yang berubah, bukan cuma "diedit" — jejaknya jadi berguna.
  const changed = (Object.keys(body) as (keyof typeof body)[]).filter(
    (k) => body[k] !== (ticket as Record<string, unknown>)[k],
  )
  if (!changed.length)
    throw createError({ statusCode: 400, statusMessage: 'Tidak ada yang diubah.' })

  return applyChange(id, body, {
    type: 'edit',
    note: `Mengubah: ${changed.join(', ')}`,
    actorId: user.id,
  })
})
