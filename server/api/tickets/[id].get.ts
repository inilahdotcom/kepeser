import { eq } from 'drizzle-orm'
import { useDb } from '../../db/client'
import { tickets, users } from '../../db/schema'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'ID tidak valid.' })
  const db = useDb()

  const [row] = await db
    .select({ t: tickets, assigneeName: users.name })
    .from(tickets)
    .leftJoin(users, eq(tickets.assigneeId, users.id))
    .where(eq(tickets.id, id))
    .limit(1)

  if (!row) throw createError({ statusCode: 404, statusMessage: 'Tiket tidak ditemukan.' })
  return { ticket: { ...row.t, assigneeName: row.assigneeName }, events: await timelineOf(id) }
})
