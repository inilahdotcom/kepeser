import nodemailer, { type Transporter } from 'nodemailer'

let cached: Transporter | null | undefined

/**
 * SMTP, bukan API vendor — supaya bisa dipakai dengan Gmail, mail server kantor,
 * atau provider transaksional tanpa mengubah kode.
 *
 * Mengembalikan null kalau SMTP_HOST kosong; pemanggil jatuh ke mode log.
 */
function transport(): Transporter | null {
  if (cached !== undefined) return cached
  const host = process.env.SMTP_HOST
  if (!host) return (cached = null)

  cached = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    // 465 = TLS implisit; 587 = STARTTLS.
    secure: String(process.env.SMTP_SECURE ?? '') === 'true' || Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  })
  return cached
}

/**
 * Alamat aplikasi untuk merakit tautan.
 *
 * SELALU dari env, TIDAK PERNAH dari header Host: penyerang bisa mengirim
 * `Host: evil.com`, lalu tautan di email korban menunjuk ke servernya dan
 * tokennya bocor begitu diklik.
 */
export function appUrl(): string {
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '')
}

export async function sendMail(to: string, subject: string, text: string) {
  const t = transport()

  // Tanpa SMTP: cetak ke log, jangan gagal. Alur ini jadi bisa diuji di dev tanpa
  // kredensial, dan salah konfigurasi di produksi terlihat di log — bukan hilang senyap.
  if (!t) {
    console.log(
      `\n[mail] SMTP_HOST kosong — email TIDAK terkirim, isinya dicetak di sini.\n` +
        `[mail] kepada : ${to}\n[mail] subjek : ${subject}\n${text}\n`,
    )
    return { terkirim: false as const }
  }

  await t.sendMail({
    from: process.env.SMTP_FROM || 'Kepeser <no-reply@inilah.com>',
    to,
    subject,
    text,
  })
  return { terkirim: true as const }
}

export function resetPasswordEmail(nama: string, token: string) {
  const url = `${appUrl()}/reset-password/${token}`
  return {
    subject: 'Reset password Kepeser',
    text: [
      `Halo ${nama},`,
      '',
      'Ada permintaan reset password untuk akun Kepeser Anda. Buka tautan berikut',
      'untuk membuat password baru:',
      '',
      url,
      '',
      'Tautan berlaku 1 jam dan hanya bisa dipakai sekali.',
      '',
      'Kalau Anda tidak meminta ini, abaikan saja email ini — password Anda tidak berubah.',
    ].join('\n'),
  }
}
