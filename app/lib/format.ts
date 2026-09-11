
export const STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu approval',
  approved: 'Disetujui',
  in_progress: 'Dikerjakan',
  done: 'Selesai',
  rejected: 'Ditolak',
}

/** Pastel callout DESIGN.md dipakai sebagai kosakata status. */
export const STATUS_TONE: Record<string, string> = {
  pending: 'bg-tone-blue-soft text-tone-blue',
  approved: 'bg-tone-purple-soft text-tone-purple',
  in_progress: 'bg-tone-purple-soft text-tone-purple',
  done: 'bg-tone-green-soft text-tone-green',
  rejected: 'bg-tone-red-soft text-tone-red',
}

export const CATEGORY_LABEL: Record<string, string> = {
  bug: 'Bug / Error',
  request_fitur: 'Request fitur',
  maintenance: 'Maintenance',
  infra_jaringan: 'Infra & jaringan',
  akses_akun: 'Akses & akun',
  perangkat: 'Perangkat',
  lainnya: 'Lainnya',
}

export const PRIORITY_LABEL: Record<string, string> = {
  low: 'Rendah',
  normal: 'Normal',
  high: 'Tinggi',
  urgent: 'Mendesak',
}

export const JOB_LABEL: Record<string, string> = {
  supervisor: 'Supervisor IT',
  frontend: 'Frontend Engineer',
  backend: 'Backend Engineer',
  devops: 'DevOps / SysAdmin',
  support: 'IT Support',
}

export const EVENT_LABEL: Record<string, string> = {
  created: 'dibuat',
  comment: 'berkomentar',
  approve: 'menyetujui',
  reject: 'menolak',
  assign: 'meng-assign',
  status: 'mengubah status',
  reopen: 'membuka kembali',
  edit: 'mengedit',
  archive: 'mengarsipkan',
  restore: 'memulihkan',
  board: 'mengubah visibilitas papan publik',
}

export function fmtDate(sec?: number | null) {
  if (!sec) return '—'
  return new Date(sec * 1000).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Durasi kasar tapi terbaca: "3j 20m", "2 hari". */
export function fmtDuration(sec?: number | null) {
  if (sec === null || sec === undefined) return '—'
  if (sec < 60) return `${Math.round(sec)} detik`
  const m = Math.floor(sec / 60)
  if (m < 60) return `${m} menit`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}j ${m % 60}m`
  const d = Math.floor(h / 24)
  return `${d} hari ${h % 24}j`
}

export function fmtPct(x?: number | null) {
  return x === null || x === undefined ? '—' : `${Math.round(x * 100)}%`
}

/** Jam default kalau user cuma memilih tanggal — akhir jam kerja, bukan dini hari. */
const DEFAULT_HOUR = '17:00'

/**
 * `<input type="datetime-local">` → epoch detik.
 *
 * `new Date('YYYY-MM-DDTHH:mm')` diparse sebagai waktu LOKAL (bukan UTC), yang
 * memang yang diinginkan: user mengetik jam menurut jamnya sendiri.
 */
export function dateTimeInputToEpoch(v: string): number | null {
  if (!v) return null
  // Browser mengisi 00:00 kalau jamnya dilewati — "besok" jangan berarti dini hari.
  const withTime = v.length === 10 ? `${v}T${DEFAULT_HOUR}` : v
  const d = new Date(withTime)
  return Number.isNaN(d.getTime()) ? null : Math.floor(d.getTime() / 1000)
}

/**
 * epoch detik → `YYYY-MM-DDTHH:mm` untuk mengisi `<input type="datetime-local">`.
 *
 * Dirakit dari getter LOKAL. `toISOString()` akan salah: di Asia/Jakarta (UTC+7)
 * jam 05:00 lokal jadi 22:00 hari sebelumnya, dan inputnya mundur sehari.
 */
export function epochToDateTimeInput(sec?: number | null): string {
  if (!sec) return ''
  const d = new Date(sec * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/** Rakit daftar opsi <SelectField> dari konstanta + peta labelnya. */
export function toOptions(keys: readonly string[], labels: Record<string, string>) {
  return keys.map((k) => ({ value: k, label: labels[k] ?? k }))
}

/** Pilihan rentang KPI — dipakai /me dan /kpi. Nilainya number, bukan string. */
export const RANGE_OPTIONS = [
  { value: 7, label: '7 hari terakhir' },
  { value: 30, label: '30 hari terakhir' },
  { value: 90, label: '90 hari terakhir' },
]

/**
 * Pemetaan nilai <-> key untuk <SelectField>. reka-ui menolak SelectItem
 * bernilai string kosong, sementara '' adalah nilai "semua" di filter.
 */
export const EMPTY_KEY = '__empty__'

export function selectKey(v: string | number) {
  return v === '' ? EMPTY_KEY : String(v)
}

/** Kembalikan nilai ASLI dari options supaya opsi number tetap number. */
export function selectValueFromKey(
  options: readonly { value: string | number }[],
  key?: string,
): string | number {
  return options.find((o) => selectKey(o.value) === key)?.value ?? ''
}

export const USER_STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu',
  active: 'Aktif',
  disabled: 'Nonaktif',
}

export const USER_STATUS_TONE: Record<string, string> = {
  pending: 'bg-tone-blue-soft text-tone-blue',
  active: 'bg-tone-green-soft text-tone-green',
  disabled: 'bg-surface-soft text-ash',
}
