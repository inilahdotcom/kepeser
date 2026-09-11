/**
 * Arsip & pulihkan — satu endpoint simetris, seperti approve.
 *
 * Soft delete, bukan DELETE: barisnya tetap ada supaya KPI periode lalu tidak
 * berubah surut dan link pelacakan pelapor tidak jadi 404.
 */
export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'supervisor')
  const id = Number(getRouterParam(event, 'id'))
  const { archived } = await readValid(event, archiveSchema)
  const ticket = await getTicketOr404(id)

  if (Boolean(ticket.archivedAt) === archived)
    throw createError({
      statusCode: 409,
      statusMessage: archived ? 'Tiket sudah diarsipkan.' : 'Tiket tidak sedang diarsipkan.',
    })

  return applyChange(
    id,
    { archivedAt: archived ? nowSec() : null },
    {
      type: archived ? 'archive' : 'restore',
      note: archived ? 'Tiket diarsipkan' : 'Tiket dipulihkan',
      actorId: user.id,
    },
  )
})
