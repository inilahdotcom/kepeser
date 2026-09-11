import { eq } from 'drizzle-orm'
import { useDb } from '../../db/client'
import { tickets, users } from '../../db/schema'

/** Publik, read-only. Pelapor tidak punya akun — token acak yang jadi kuncinya. */
export default defineEventHandler(async (event) => {
  rateLimit(event, 'track', 30, 60)
  const token = getRouterParam(event, 'token') ?? ''
  const db = useDb()

  const [row] = await db
    .select({
      id: tickets.id,
      title: tickets.title,
      description: tickets.description,
      category: tickets.category,
      priority: tickets.priority,
      status: tickets.status,
      reporterName: tickets.reporterName,
      reporterDivision: tickets.reporterDivision,
      rejectReason: tickets.rejectReason,
      createdAt: tickets.createdAt,
      dueAt: tickets.dueAt,
      doneAt: tickets.doneAt,
      archivedAt: tickets.archivedAt,
      imagePath: tickets.imagePath,
      assigneeName: users.name,
    })
    .from(tickets)
    .leftJoin(users, eq(tickets.assigneeId, users.id))
    .where(eq(tickets.publicToken, token))
    .limit(1)

  if (!row) throw createError({ statusCode: 404, statusMessage: 'Tiket tidak ditemukan.' })
  // Cukup beri tahu ADA atau TIDAK; nama berkas di disk tidak perlu keluar.
  const { imagePath, ...ticket } = row
  // Komentar internal tidak dibocorkan ke pelapor — hanya jejak alurnya.
  const events = (await timelineOf(row.id)).filter((e) => e.type !== 'comment')
  return { ticket: { ...ticket, hasImage: Boolean(imagePath) }, events }
})
