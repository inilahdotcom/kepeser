export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const ACCEPTED_IMAGE_TYPES = 'image/png,image/jpeg,image/webp'
const MAX_EDGE = 1600

/**
 * Gambar SELALU digambar ulang ke canvas sebelum dikirim — bahkan kalau ukurannya
 * sudah kecil. Dua alasan:
 *
 *  1. Foto layar dari HP rutin 3–8 MB dan akan tertolak batas 5 MB di server.
 *  2. Encode ulang membuang EXIF, termasuk koordinat GPS yang sering menempel di
 *     foto HP dan tidak ada urusannya dengan tiket IT.
 *
 * Pakai <canvas> bawaan browser — tidak perlu pustaka pengolah gambar di server.
 */
export async function prepareImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)

    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    // PNG dipertahankan (screenshot UI tajam); sisanya jadi JPEG yang jauh lebih kecil.
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.85))
    return blob ?? file
  } finally {
    bitmap.close()
  }
}
