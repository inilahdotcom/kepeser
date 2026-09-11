import type { Category, Ticket } from '../db/schema'

export type KpiRow = Pick<
  Ticket,
  'assigneeId' | 'status' | 'assignedAt' | 'doneAt' | 'dueAt' | 'reopenCount' | 'category'
>

export type Kpi = {
  /** Tiket done dalam rentang. Basis semua rasio di bawah. */
  doneCount: number
  /** Detik, assigned_at → done_at. null kalau belum ada tiket done yang layak hitung. */
  medianResolutionSec: number | null
  /** 0..1 dari tiket done yang punya due date. null kalau tidak ada due date sama sekali. */
  onTimeRate: number | null
  /** 0..1 dari tiket done. null kalau belum ada tiket done. */
  reopenRate: number | null
  throughputByCategory: Record<string, number>
  /** Belum selesai, sudah lewat due date. Bukan KPI historis — ini alarm hari ini. */
  overdueOpen: number
}

/** ponytail: median dihitung di JS. Pindah ke window function SQL kalau tiket
 *  sudah puluhan ribu — untuk tim 15 orang tidak akan sampai situ. */
export function median(xs: number[]): number | null {
  if (xs.length === 0) return null
  const s = [...xs].sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2
}

/**
 * Hitung KPI dari baris tiket mentah. Fungsi murni — pemanggil yang memfilter
 * rentang tanggal dan staff, di sini hanya aritmetika.
 *
 * `now` di-inject supaya `overdueOpen` bisa ditest tanpa bergantung jam dinding.
 */
export function computeKpi(rows: KpiRow[], now: number): Kpi {
  const done = rows.filter((r) => r.status === 'done' && r.doneAt !== null)

  const durations = done
    .filter((r) => r.assignedAt !== null && r.doneAt! >= r.assignedAt!)
    .map((r) => r.doneAt! - r.assignedAt!)

  const withDue = done.filter((r) => r.dueAt !== null)
  const onTime = withDue.filter((r) => r.doneAt! <= r.dueAt!).length

  const throughputByCategory: Record<string, number> = {}
  for (const r of done) {
    const k = r.category as Category
    throughputByCategory[k] = (throughputByCategory[k] ?? 0) + 1
  }

  const overdueOpen = rows.filter(
    (r) =>
      r.status !== 'done' &&
      r.status !== 'rejected' &&
      r.dueAt !== null &&
      r.dueAt < now,
  ).length

  return {
    doneCount: done.length,
    medianResolutionSec: median(durations),
    onTimeRate: withDue.length ? onTime / withDue.length : null,
    reopenRate: done.length
      ? done.filter((r) => r.reopenCount > 0).length / done.length
      : null,
    throughputByCategory,
    overdueOpen,
  }
}
