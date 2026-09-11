/**
 * Sembunyikan / tampilkan tiket di papan publik halaman depan.
 *
 * Supervisor saja — bukan digabung ke PATCH /api/tickets/[id] yang juga terbuka
 * untuk penanggung jawab. Apa yang terbit ke seluruh perusahaan bukan keputusan staff.
 */
export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'supervisor')
  const id = Number(getRouterParam(event, 'id'))
  const { hidden } = await readValid(event, boardSchema)
  const ticket = await getTicketOr404(id)

  if (Boolean(ticket.publicHidden) === hidden)
    throw createError({
      statusCode: 409,
      statusMessage: hidden
        ? 'Tiket sudah disembunyikan dari papan publik.'
        : 'Tiket sudah tampil di papan publik.',
    })

  return applyChange(
    id,
    { publicHidden: hidden ? 1 : 0 },
    {
      type: 'board',
      note: hidden ? 'Disembunyikan dari papan publik' : 'Ditampilkan di papan publik',
      actorId: user.id,
    },
  )
})
