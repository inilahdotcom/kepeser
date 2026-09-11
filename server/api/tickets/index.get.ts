import { and, desc, eq, inArray, isNotNull, isNull, type SQL } from 'drizzle-orm'
import { useDb } from '../../db/client'
import { STATUSES, tickets, users, type Status } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const q = getQuery(event)
  const db = useDb()

  const where: SQL[] = []

  // Satu-satunya sumber /tickets, /me, dan /inbox — jadi menyaring di sini
  // membersihkan ketiganya sekaligus.
  where.push(q.archived === '1' ? isNotNull(tickets.archivedAt) : isNull(tickets.archivedAt))

  if (typeof q.status === 'string' && q.status) {
    const wanted = q.status.split(',').filter((s): s is Status => STATUSES.includes(s as Status))
    if (wanted.length) where.push(inArray(tickets.status, wanted))
  }
  if (typeof q.category === 'string' && q.category)
    where.push(eq(tickets.category, q.category as never))
  if (typeof q.priority === 'string' && q.priority)
    where.push(eq(tickets.priority, q.priority as never))

  // Staff boleh melihat semua tiket (transparansi tim), tapi `mine=1` memfilter
  // ke tugasnya sendiri — dipakai halaman /me.
  if (q.mine === '1') where.push(eq(tickets.assigneeId, user.id))
  else if (typeof q.assigneeId === 'string' && q.assigneeId)
    where.push(eq(tickets.assigneeId, Number(q.assigneeId)))

  return db
    .select({
      id: tickets.id,
      title: tickets.title,
      category: tickets.category,
      priority: tickets.priority,
      status: tickets.status,
      source: tickets.source,
      reporterName: tickets.reporterName,
      reporterDivision: tickets.reporterDivision,
      assigneeId: tickets.assigneeId,
      assigneeName: users.name,
      createdAt: tickets.createdAt,
      dueAt: tickets.dueAt,
      doneAt: tickets.doneAt,
      reopenCount: tickets.reopenCount,
      archivedAt: tickets.archivedAt,
      publicHidden: tickets.publicHidden,
    })
    .from(tickets)
    .leftJoin(users, eq(tickets.assigneeId, users.id))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(tickets.createdAt))
    .limit(Math.min(Number(q.limit) || 200, 500))
})
