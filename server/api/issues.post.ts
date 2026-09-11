import { useDb } from '../db/client'
import { ticketEvents, tickets } from '../db/schema'
import { MAX_IMAGE_BYTES, sniffImageMime } from '../domain/image'

/** Publik — tanpa login. Siapa pun di inilah.com bisa lapor. */
export default defineEventHandler(async (event) => {
  rateLimit(event, 'issues', 5, 10)

  // Tolak sebelum mem-buffer body kalau client jujur soal ukurannya. Penghalang
  // sebenarnya untuk unggahan raksasa tetap di reverse proxy (client_max_body_size).
  const declared = Number(getRequestHeader(event, 'content-length') || 0)
  if (declared > MAX_IMAGE_BYTES + 512 * 1024)
    throw createError({ statusCode: 413, statusMessage: 'Lampiran terlalu besar. Maksimal 5 MB.' })

  const parts = (await readMultipartFormData(event)) ?? []

  const fields: Record<string, string> = {}
  let image: { data: Uint8Array } | undefined
  for (const p of parts) {
    if (!p.name) continue
    if (p.name === 'image' && p.filename) image = { data: p.data }
    else fields[p.name] = p.data.toString('utf8')
  }

  const body = validate(issueSchema, fields)

  let imagePath: string | null = null
  let imageMime: string | null = null

  if (image && image.data.length) {
    if (image.data.length > MAX_IMAGE_BYTES)
      throw createError({
        statusCode: 400,
        statusMessage: 'Lampiran terlalu besar. Maksimal 5 MB.',
      })

    // Isi berkas yang menentukan, bukan Content-Type atau nama dari client.
    const mime = sniffImageMime(image.data)
    if (!mime)
      throw createError({
        statusCode: 400,
        statusMessage: 'Lampiran harus berupa gambar JPG, PNG, atau WebP.',
      })

    imagePath = await saveImage(image.data, mime)
    imageMime = mime
  }

  try {
    const db = useDb()
    const ticket = db.transaction((tx) => {
      const row = tx
        .insert(tickets)
        .values({
          ...body,
          source: 'issue',
          status: 'pending',
          publicToken: publicToken(),
          imagePath,
          imageMime,
        })
        .returning()
        .get()
      tx.insert(ticketEvents)
        .values({
          ticketId: row.id,
          type: 'created',
          note: `Dilaporkan oleh ${body.reporterName}${imagePath ? ' (dengan lampiran)' : ''}`,
        })
        .run()
      return row
    })
    return { id: ticket.id, publicToken: ticket.publicToken }
  } catch (e) {
    // Jangan tinggalkan berkas yatim kalau INSERT-nya gagal.
    await deleteImage(imagePath)
    throw e
  }
})
