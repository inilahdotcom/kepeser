import { canTransition } from '../../../domain/transitions'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'supervisor')
  const id = Number(getRouterParam(event, 'id'))
  const { approve, reason } = await readValid(event, approveSchema)
  const ticket = await getTicketOr404(id)

  const action = approve ? 'approve' : 'reject'
  const check = canTransition(ticket, action, user)
  if (!check.ok) throw createError({ statusCode: 409, statusMessage: check.reason })

  if (!approve && !reason?.trim())
    throw createError({ statusCode: 400, statusMessage: 'Alasan penolakan wajib diisi.' })

  return applyChange(
    id,
    approve
      ? { status: check.next, approvedAt: nowSec() }
      : { status: check.next, rejectReason: reason!.trim() },
    { type: action, note: reason?.trim() || null, actorId: user.id },
  )
})
