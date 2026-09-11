import { and, desc, eq, gte, inArray, isNull, or } from 'drizzle-orm'
import { useDb } from '../db/client'
import { tickets, users } from '../db/schema'

const RECENT_DONE_DAYS = 7

/**
 * Papan publik "sedang dikerjakan tim IT" — TANPA login.
 *
 * Proyeksinya sengaja ditulis kolom per kolom, bukan `select()` polos: apa pun
 * yang ada di sini terbit ke siapa saja yang bisa membuka halaman depan.
 *
 * Yang TIDAK boleh masuk sini, dan alasannya:
 *   reporterName, reporterDivision  data karyawan lain
 *   description                     isi lengkap issue
 *   priority                        memancing "kenapa punya saya tidak mendesak"
 *   dueAt                           target internal, jangan jadi janji ke perusahaan
 *   publicToken                     kunci pelacakan pelapor
 */
export default defineEventHandler(async (event) => {
  rateLimit(event, 'board', 30, 60)
  const db = useDb()
  const cutoff = nowSec() - RECENT_DONE_DAYS * 86400

  return db
    .select({
      id: tickets.id,
      title: tickets.title,
      category: tickets.category,
      status: tickets.status,
      assigneeName: users.name,
      updatedAt: tickets.updatedAt,
    })
    .from(tickets)
    .leftJoin(users, eq(tickets.assigneeId, users.id))
    .where(
      and(
        isNull(tickets.archivedAt),
        eq(tickets.publicHidden, 0),
        or(
          // `pending` sengaja tidak ikut: belum disetujui, bisa berakhir ditolak.
          inArray(tickets.status, ['approved', 'in_progress']),
          and(eq(tickets.status, 'done'), gte(tickets.doneAt, cutoff)),
        ),
      ),
    )
    .orderBy(desc(tickets.updatedAt))
    .limit(30)
})
