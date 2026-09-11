export const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type ImageMime = (typeof ALLOWED_IMAGE_MIMES)[number]

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export const MIME_EXT: Record<ImageMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const starts = (b: Uint8Array, sig: number[]) =>
  b.length >= sig.length && sig.every((v, i) => b[i] === v)

/**
 * Satu-satunya penentu tipe berkas unggahan.
 *
 * `Content-Type` dan nama berkas dari client tidak pernah ikut memutuskan apa pun —
 * keduanya sepenuhnya dikendalikan penyerang. Yang dipercaya hanya isi berkasnya.
 *
 * SVG sengaja TIDAK ada di daftar: itu XML yang bisa memuat <script>, dan menyajikannya
 * dari origin yang sama berarti stored XSS.
 */
export function sniffImageMime(buf: Uint8Array): ImageMime | null {
  if (starts(buf, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (starts(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  // RIFF....WEBP — 4 byte ukuran di antaranya bebas, jadi dicek dua potong.
  if (buf.length >= 12 && starts(buf, [0x52, 0x49, 0x46, 0x46])) {
    const webp = [0x57, 0x45, 0x42, 0x50]
    if (webp.every((v, i) => buf[8 + i] === v)) return 'image/webp'
  }
  return null
}
