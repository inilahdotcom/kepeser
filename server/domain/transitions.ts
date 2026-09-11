import type { Status } from '../db/schema'

export const ACTIONS = ['approve', 'reject', 'assign', 'start', 'done', 'reopen'] as const
export type Action = (typeof ACTIONS)[number]

/** Bentuk minimal yang dibutuhkan aturan — bukan baris DB penuh, supaya gampang ditest. */
export type TicketShape = {
  status: Status
  assigneeId: number | null
  archivedAt?: number | null
}
export type ActorShape = { id: number; role: 'supervisor' | 'staff' }

const NEXT: Record<Action, { from: Status[]; to: Status }> = {
  approve: { from: ['pending'], to: 'approved' },
  reject: { from: ['pending'], to: 'rejected' },
  // assign boleh berulang: pindah tangan saat masih approved atau sudah jalan.
  assign: { from: ['approved', 'in_progress'], to: 'approved' },
  start: { from: ['approved'], to: 'in_progress' },
  done: { from: ['in_progress'], to: 'done' },
  reopen: { from: ['done'], to: 'in_progress' },
}

const SUPERVISOR_ONLY: Action[] = ['approve', 'reject', 'assign', 'reopen']

/**
 * Satu-satunya tempat aturan alur hidup tiket. Semua route mutasi lewat sini —
 * bukan `if` yang tersebar di tiap handler.
 */
export function canTransition(
  ticket: TicketShape,
  action: Action,
  actor: ActorShape,
): { ok: true; next: Status } | { ok: false; reason: string } {
  const rule = NEXT[action]
  if (!rule) return { ok: false, reason: `Aksi tidak dikenal: ${action}` }

  // Tiket terarsip beku terhadap semua aksi. Diletakkan di sini, bukan di tiap
  // route, karena semua rute mutasi lewat fungsi ini.
  if (ticket.archivedAt)
    return { ok: false, reason: 'Tiket ini sudah diarsipkan. Pulihkan dulu sebelum diubah.' }

  if (!rule.from.includes(ticket.status))
    return {
      ok: false,
      reason: `Tiket berstatus "${ticket.status}" tidak bisa di-${action}.`,
    }

  if (SUPERVISOR_ONLY.includes(action) && actor.role !== 'supervisor')
    return { ok: false, reason: 'Hanya supervisor yang boleh melakukan aksi ini.' }

  // start/done: assignee-nya sendiri, atau supervisor yang menutup atas nama tim.
  if ((action === 'start' || action === 'done') && actor.role !== 'supervisor') {
    if (ticket.assigneeId !== actor.id)
      return { ok: false, reason: 'Tiket ini bukan tugas Anda.' }
  }

  // Tidak ada yang bisa dikerjakan sebelum ada penanggung jawab.
  if ((action === 'start' || action === 'done') && ticket.assigneeId === null)
    return { ok: false, reason: 'Tiket belum di-assign ke siapa pun.' }

  return { ok: true, next: rule.to }
}

/**
 * Siapa yang jadi penanggung jawab saat tugas internal dibuat.
 *
 * Aturannya satu baris karena memang satu aturan: pembuat mengerjakan tugasnya
 * sendiri, kecuali supervisor menunjuk orang lain. Staff yang mengirim
 * `assigneeId` orang lain diabaikan — bukan ditolak — supaya tidak ada jalur
 * melempar kerja ke rekan lewat API.
 */
export function resolveAssignee(actor: ActorShape, requestedId?: number | null): number {
  return actor.role === 'supervisor' && requestedId ? requestedId : actor.id
}
