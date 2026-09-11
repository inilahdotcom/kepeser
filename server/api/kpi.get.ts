import { and, eq, gte, lte, type SQL } from 'drizzle-orm'
import { useDb } from '../db/client'
import { tickets, users } from '../db/schema'
import { computeKpi, type KpiRow } from '../domain/kpi'

/**
 * KPI per staff. Supervisor melihat semua; staff dipaksa ke dirinya sendiri —
 * di server, bukan dengan menyembunyikan tombol di UI.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const q = getQuery(event)
  const db = useDb()

  const now = nowSec()
  const from = Number(q.from) || now - 30 * 86400
  const to = Number(q.to) || now

  const staff = await db
    .select({ id: users.id, name: users.name, jobTitle: users.jobTitle, role: users.role })
    .from(users)
    .where(eq(users.status, 'active'))

  const scope =
    user.role === 'supervisor'
      ? q.userId
        ? staff.filter((s) => s.id === Number(q.userId))
        : staff
      : staff.filter((s) => s.id === user.id)

  const rows = await Promise.all(
    scope.map(async (s) => {
      // Tiket done difilter pakai done_at (kapan kerjanya selesai), tiket hidup
      // pakai created_at — supaya `overdueOpen` tidak hilang gara-gara rentang tanggal.
      const where: SQL[] = [eq(tickets.assigneeId, s.id)]
      const data = (await db
        .select({
          assigneeId: tickets.assigneeId,
          status: tickets.status,
          assignedAt: tickets.assignedAt,
          doneAt: tickets.doneAt,
          dueAt: tickets.dueAt,
          reopenCount: tickets.reopenCount,
          category: tickets.category,
        })
        .from(tickets)
        .where(and(...where))) as KpiRow[]

      const inRange = data.filter((r) =>
        r.status === 'done'
          ? r.doneAt !== null && r.doneAt >= from && r.doneAt <= to
          : r.status !== 'rejected',
      )
      return { ...s, kpi: computeKpi(inRange, now) }
    }),
  )

  return { from, to, staff: rows }
})
