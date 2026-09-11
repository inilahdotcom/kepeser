/**
 * Apakah email boleh mendaftar, menurut domain yang diizinkan.
 *
 * Membandingkan PERSIS bagian setelah `@` terakhir. Godaannya menulis
 * `email.endsWith(domain)` — dan itu meloloskan `penyerang@evilinilah.com`
 * maupun `penyerang@inilah.com.evil.id`. Karena itu dipisah dan ditest.
 *
 * `allowed` kosong = tanpa pembatasan.
 */
export function emailDomainAllowed(email: string, allowed?: string | null): boolean {
  const domain = (allowed ?? '').trim().toLowerCase()
  if (!domain) return true

  const at = email.lastIndexOf('@')
  if (at < 1 || at === email.length - 1) return false
  return email.slice(at + 1).trim().toLowerCase() === domain
}
