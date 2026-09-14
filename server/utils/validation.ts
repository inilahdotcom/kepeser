import { z } from 'zod'
import { CATEGORIES, JOB_TITLES, PRIORITIES, ROLES, USER_STATUSES } from '../db/schema'

const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max)

export const issueSchema = z.object({
  reporterName: trimmed(2, 80),
  reporterDivision: trimmed(2, 80),
  title: trimmed(5, 160),
  description: trimmed(10, 5000),
  category: z.enum(CATEGORIES),
})

export const internalTicketSchema = issueSchema
  .omit({ reporterName: true, reporterDivision: true })
  .extend({
    priority: z.enum(PRIORITIES).default('normal'),
    /** Hanya dihormati kalau pembuatnya supervisor — lihat resolveAssignee(). */
    assigneeId: z.number().int().positive().nullable().optional(),
    /** epoch detik */
    dueAt: z.number().int().positive().nullable().optional(),
  })

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(160),
  password: z.string().min(1).max(200),
})

export const assignSchema = z.object({
  assigneeId: z.number().int().positive(),
  /** epoch detik */
  dueAt: z.number().int().positive().nullable().optional(),
  priority: z.enum(PRIORITIES).optional(),
})

export const approveSchema = z.object({
  approve: z.boolean(),
  reason: z.string().trim().max(500).optional(),
})

export const statusActionSchema = z.object({
  action: z.enum(['start', 'done', 'reopen']),
  note: z.string().trim().max(2000).optional(),
})

export const commentSchema = z.object({ note: trimmed(1, 2000) })

/** Edit isi tiket. Status & penanggung jawab TIDAK di sini — keduanya sudah
 *  punya endpoint sendiri dengan aturan transisi. */
export const editTicketSchema = z.object({
  title: trimmed(5, 160),
  description: trimmed(10, 5000),
  category: z.enum(CATEGORIES),
  priority: z.enum(PRIORITIES),
})

export const archiveSchema = z.object({ archived: z.boolean() })

/** Sembunyikan / tampilkan tiket di papan publik halaman depan. */
export const boardSchema = z.object({ hidden: z.boolean() })

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(160),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8).max(200),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
})

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(160),
  name: trimmed(2, 80),
  password: z.string().min(8).max(200),
  role: z.enum(ROLES).default('staff'),
  jobTitle: z.enum(JOB_TITLES).default('support'),
})

export const updateUserSchema = z.object({
  name: trimmed(2, 80).optional(),
  password: z.string().min(8).max(200).optional(),
  role: z.enum(ROLES).optional(),
  jobTitle: z.enum(JOB_TITLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
})

/**
 * Pendaftaran mandiri. Perhatikan: TIDAK ada `role` dan `status` di sini —
 * keduanya ditentukan server. Kalau `role` boleh dikirim client, siapa pun bisa
 * mendaftar sebagai supervisor dan tinggal menunggu persetujuan yang terlihat biasa.
 */
export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(160),
  name: trimmed(2, 80),
  password: z.string().min(8).max(200),
  jobTitle: z.enum(JOB_TITLES),
})

/**
 * Nama field dalam bahasa manusia. Yang tidak terdaftar dipakai apa adanya —
 * lebih baik nama teknis muncul daripada errornya hilang.
 */
const FIELD_LABEL: Record<string, string> = {
  reporterName: 'Nama',
  reporterDivision: 'Divisi',
  title: 'Judul',
  description: 'Deskripsi',
  category: 'Kategori',
  priority: 'Prioritas',
  email: 'Email',
  password: 'Password',
  name: 'Nama',
  role: 'Peran',
  jobTitle: 'Jabatan',
  status: 'Status',
  token: 'Tautan reset',
  currentPassword: 'Password saat ini',
  newPassword: 'Password baru',
  assigneeId: 'Penanggung jawab',
  dueAt: 'Target selesai',
  note: 'Catatan',
  reason: 'Alasan',
  action: 'Aksi',
  approve: 'Keputusan',
  archived: 'Status arsip',
}

/**
 * Pesan validasi bahasa Indonesia yang enak dibaca.
 *
 * Zod 4 punya locale `id`, tapi hasilnya terjemahan harfiah — "Terlalu kecil:
 * diharapkan string memiliki >=10 karakter". Mengganti robot Inggris dengan robot
 * Indonesia bukan perbaikan; form ini dipakai orang non-IT dari semua divisi.
 */
function humanize(issue: z.core.$ZodIssue): string {
  const field = FIELD_LABEL[String(issue.path[0] ?? '')] ?? String(issue.path[0] ?? 'Isian')

  switch (issue.code) {
    case 'invalid_type':
      return issue.input === undefined || issue.input === null
        ? `${field} wajib diisi.`
        : `${field} tidak valid.`
    case 'too_small': {
      const n = Number(issue.minimum)
      if (issue.origin === 'string')
        return n <= 1 ? `${field} wajib diisi.` : `${field} minimal ${n} karakter.`
      return `${field} minimal ${n}.`
    }
    case 'too_big': {
      const n = Number(issue.maximum)
      return issue.origin === 'string'
        ? `${field} maksimal ${n} karakter.`
        : `${field} maksimal ${n}.`
    }
    case 'invalid_value':
      return `${field} tidak valid.`
    case 'invalid_format':
      return issue.format === 'email'
        ? 'Format email tidak valid.'
        : `Format ${field.toLowerCase()} tidak valid.`
    default:
      // Kode yang belum dipetakan tetap muncul, bukan tertelan diam-diam.
      return `${field}: ${issue.message}`
  }
}

/**
 * Satu pintu validasi. Dipisah dari readValid() supaya handler multipart
 * (yang tidak punya body JSON) memakai peta pesan yang sama persis.
 */
export function validate<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const parsed = schema.safeParse(data)
  if (!parsed.success)
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues.map(humanize).join(' '),
    })
  return parsed.data
}

export async function readValid<T extends z.ZodTypeAny>(
  event: Parameters<typeof readBody>[0],
  schema: T,
): Promise<z.infer<T>> {
  return validate(schema, await readBody(event))
}
