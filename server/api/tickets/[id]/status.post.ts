import { canTransition } from '../../../domain/transitions'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = Number(getRouterParam(event, 'id'))
  const { action, note } = await readValid(event, statusActionSchema)
  const ticket = await getTicketOr404(id)

  const check = canTransition(ticket, action, user)
  if (!check.ok) throw createError({ statusCode: 409, statusMessage: check.reason })

  const now = nowSec()
  const patch =
    action === 'start'
      ? { status: check.next, startedAt: ticket.startedAt ?? now }
      : action === 'done'
        ? { status: check.next, doneAt: now }
        : { status: check.next, doneAt: null, reopenCount: ticket.reopenCount + 1 }

  return applyChange(id, patch, {
    type: action === 'reopen' ? 'reopen' : 'status',
    note: note?.trim() || null,
    actorId: user.id,
  })
})
