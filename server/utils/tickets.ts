import { desc, eq } from 'drizzle-orm'
import { useDb } from '../db/client'
import { ticketEvents, tickets, users, type EventType } from '../db/schema'

/** Token publik: 128 bit base36. crypto ada di stdlib — tidak perlu nanoid. */
export function publicToken() {
  const b = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(b, (x) => x.toString(36).padStart(2, '0')).join('')
}

export function nowSec() {
  return Math.floor(Date.now() / 1000)
}

export async function getTicketOr404(id: number) {
  const db = useDb()
  const [row] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Tiket tidak ditemukan.' })
  return row
}

/** Timeline + nama aktor. Dipakai halaman detail dan halaman lacak publik. */
export async function timelineOf(ticketId: number) {
  const db = useDb()
  return db
    .select({
      id: ticketEvents.id,
      type: ticketEvents.type,
      note: ticketEvents.note,
      createdAt: ticketEvents.createdAt,
      actorName: users.name,
    })
    .from(ticketEvents)
    .leftJoin(users, eq(ticketEvents.actorId, users.id))
    .where(eq(ticketEvents.ticketId, ticketId))
    .orderBy(desc(ticketEvents.createdAt))
}

export type EventInput = { type: EventType; note?: string | null; actorId?: number | null }

/**
 * Ubah tiket dan catat jejaknya dalam satu transaksi. Tidak ada jalur lain untuk
 * menulis ke `tickets` — sehingga tidak ada perubahan status tanpa jejak.
 */
export function applyChange(
  ticketId: number,
  patch: Partial<typeof tickets.$inferInsert>,
  event: EventInput,
) {
  const db = useDb()
  return db.transaction((tx) => {
    tx.update(tickets)
      .set({ ...patch, updatedAt: nowSec() })
      .where(eq(tickets.id, ticketId))
      .run()
    tx.insert(ticketEvents)
      .values({
        ticketId,
        actorId: event.actorId ?? null,
        type: event.type,
        note: event.note ?? null,
      })
      .run()
    return tx.select().from(tickets).where(eq(tickets.id, ticketId)).get()!
  })
}
