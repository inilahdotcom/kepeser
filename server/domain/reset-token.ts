import { createHash, randomBytes } from 'node:crypto'

/** Satu jam. Cukup untuk membuka email, terlalu pendek untuk jadi kunci cadangan. */
export const RESET_TTL_SEC = 3600

export type ResetRow = { expiresAt: number; usedAt: number | null } | undefined | null
export type ResetState = 'valid' | 'expired' | 'used' | 'unknown'

/**
 * Yang DISIMPAN adalah hash-nya, yang DIKIRIM lewat email tokennya. Kalau DB
 * bocor, token yang masih aktif pun tidak bisa dipakai.
 *
 * SHA-256 (cepat) sudah cukup di sini — beda dengan password. Token ini 256 bit
 * acak, jadi tidak ada ruang tebakan yang bisa dijelajahi; hash lambat hanya
 * memperlambat server sendiri tanpa menambah keamanan.
 */
export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function makeResetToken() {
  const token = randomBytes(32).toString('base64url')
  return { token, tokenHash: hashResetToken(token) }
}

/**
 * Satu-satunya tempat yang memutuskan sebuah token boleh dipakai. Murni, jadi
 * bisa dites tanpa DB maupun HTTP.
 */
export function resetTokenState(row: ResetRow, now: number): ResetState {
  if (!row) return 'unknown'
  if (row.usedAt) return 'used'
  if (row.expiresAt <= now) return 'expired'
  return 'valid'
}
