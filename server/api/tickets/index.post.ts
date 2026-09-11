import { eq } from 'drizzle-orm'
import { useDb } from '../../db/client'
import { ticketEvents, tickets, users } from '../../db/schema'
import { resolveAssignee } from '../../domain/transitions'

/**
 * Tugas internal — maintenance, infra, pengembangan sistem baru. Tidak lewat
 * antrean approval: yang bikin adalah tim IT sendiri, tidak ada yang perlu
 * disetujui. Semua staff IT boleh, bukan supervisor saja.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { assigneeId: requested, dueAt, ...body } = await readValid(event, internalTicketSchema)
  const db = useDb()

  const assigneeId = resolveAssignee(user, requested)

  const [assignee] = await db.select().from(users).where(eq(users.id, assigneeId)).limit(1)
  if (!assignee || assignee.status !== 'active')
    throw createError({ statusCode: 400, statusMessage: 'Staff tidak ditemukan atau nonaktif.' })

  const now = nowSec()
  return db.transaction((tx) => {
    const row = tx
      .insert(tickets)
      .values({
        ...body,
        // Pelapor tugas internal = pembuatnya. Diambil dari sesi, tidak dari
        // body — client tidak perlu tahu, dan tidak bisa memalsukan.
        reporterName: user.name,
        reporterDivision: 'IT',
        source: 'internal',
        status: 'approved',
        publicToken: publicToken(),
        createdBy: user.id,
        approvedAt: now,
        assigneeId,
        assignedAt: now,
        dueAt: dueAt ?? null,
      })
      .returning()
      .get()
    tx.insert(ticketEvents)
      .values({
        ticketId: row.id,
        actorId: user.id,
        type: 'created',
        note:
          assigneeId === user.id
            ? 'Tugas internal, dikerjakan sendiri'
            : `Tugas internal, di-assign ke ${assignee.name}`,
      })
      .run()
    return row
  })
})
