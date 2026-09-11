import { and, eq } from 'drizzle-orm'
import { useDb } from '../../db/client'
import { users } from '../../db/schema'

/**
 * Menolak pendaftaran. HANYA baris berstatus 'pending' yang boleh dihapus —
 * batasan itu yang membuat endpoint ini aman secara konstruksi: akun pending
 * belum pernah bisa login, jadi mustahil punya tiket, komentar, atau riwayat KPI
 * yang ikut hilang.
 *
 * Akun yang sudah aktif tidak bisa dihapus lewat jalur mana pun — hanya
 * di-'disabled', supaya KPI historisnya utuh. Alasan yang sama dengan arsip tiket.
 *
 * Dihapus, bukan ditandai 'rejected', supaya orang yang salah ketik email bisa
 * mendaftar ulang — indeks unik email akan memblokir baris yang ditinggalkan.
 */
export default defineEventHandler(async (event) => {
  await requireRole(event, 'supervisor')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'ID tidak valid.' })

  const row = useDb()
    .delete(users)
    .where(and(eq(users.id, id), eq(users.status, 'pending')))
    .returning({ id: users.id, email: users.email })
    .get()

  if (!row)
    throw createError({
      statusCode: 409,
      statusMessage:
        'Hanya akun yang menunggu persetujuan yang bisa dihapus. Akun aktif cukup dinonaktifkan.',
    })
  return row
})
