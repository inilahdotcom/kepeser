import { eq } from 'drizzle-orm'
import { useDb } from '../../../db/client'
import { passwordResets } from '../../../db/schema'
import { hashResetToken, resetTokenState } from '../../../domain/reset-token'

/**
 * Cek keabsahan tautan SEBELUM form ditampilkan — supaya orang tahu tautannya
 * kedaluwarsa sebelum mengetik password baru, bukan sesudah.
 */
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token') ?? ''
  const [row] = await useDb()
    .select()
    .from(passwordResets)
    .where(eq(passwordResets.tokenHash, hashResetToken(token)))
    .limit(1)

  return { state: resetTokenState(row, nowSec()) }
})
