import { createReadStream } from 'node:fs'
import { join } from 'node:path'
import { eq } from 'drizzle-orm'
import { useDb } from '../../../db/client'
import { tickets } from '../../../db/schema'

/**
 * Lampiran tiket. Tidak ada URL publik telanjang — kalau ada, siapa pun bisa
 * memakai server ini sebagai hosting berkas gratis.
 *
 * Boleh diakses staff yang login, ATAU pelapor lewat publicToken tiketnya sendiri.
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'ID tidak valid.' })

  const [row] = await useDb()
    .select({
      imagePath: tickets.imagePath,
      imageMime: tickets.imageMime,
      publicToken: tickets.publicToken,
    })
    .from(tickets)
    .where(eq(tickets.id, id))
    .limit(1)

  if (!row?.imagePath)
    throw createError({ statusCode: 404, statusMessage: 'Lampiran tidak ditemukan.' })

  const token = getQuery(event).token
  if (typeof token !== 'string' || token !== row.publicToken) {
    // Bukan pelapornya — harus staff yang login.
    await requireUser(event)
  }

  setResponseHeaders(event, {
    // Tipe dari hasil sniff saat unggah, bukan dari apa pun yang dikirim client.
    'content-type': row.imageMime ?? 'application/octet-stream',
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'; sandbox",
    'content-disposition': 'inline',
    'cache-control': 'private, max-age=3600',
  })
  return sendStream(event, createReadStream(join(uploadDir(), row.imagePath)))
})
