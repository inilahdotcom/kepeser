import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { MIME_EXT, type ImageMime } from '../domain/image'

/** Menumpang volume yang sama dengan SQLite, jadi ikut ter-backup bersama DB. */
export function uploadDir() {
  return resolve(process.env.UPLOAD_DIR || './data/uploads')
}

/**
 * Nama berkas dibuat sendiri dari UUID + ekstensi hasil sniff. Nama unggahan
 * tidak pernah disentuh — path traversal mati karena konstruksi, bukan karena
 * disaring.
 */
export async function saveImage(buf: Uint8Array, mime: ImageMime): Promise<string> {
  const dir = uploadDir()
  await mkdir(dir, { recursive: true })
  const name = `${crypto.randomUUID()}.${MIME_EXT[mime]}`
  await writeFile(join(dir, name), buf)
  return name
}

export async function deleteImage(name?: string | null) {
  if (!name) return
  // Sabuk pengaman kedua: kalaupun ada nama aneh yang lolos ke DB, jangan sampai
  // unlink() keluar dari UPLOAD_DIR.
  if (name.includes('/') || name.includes('\\') || name.includes('..')) return
  await unlink(join(uploadDir(), name)).catch(() => {})
}
