import { expect, test } from 'bun:test'
import { canTransition, resolveAssignee, type ActorShape, type TicketShape } from './transitions'
import { computeKpi, median, type KpiRow } from './kpi'

const sup: ActorShape = { id: 1, role: 'supervisor' }
const staff: ActorShape = { id: 2, role: 'staff' }
const other: ActorShape = { id: 3, role: 'staff' }
const t = (s: TicketShape['status'], assigneeId: number | null = null): TicketShape => ({
  status: s,
  assigneeId,
})

test('alur bahagia: pending → approved → in_progress → done', () => {
  expect(canTransition(t('pending'), 'approve', sup)).toEqual({ ok: true, next: 'approved' })
  expect(canTransition(t('approved', 2), 'start', staff)).toEqual({
    ok: true,
    next: 'in_progress',
  })
  expect(canTransition(t('in_progress', 2), 'done', staff)).toEqual({ ok: true, next: 'done' })
  expect(canTransition(t('done', 2), 'reopen', sup)).toEqual({ ok: true, next: 'in_progress' })
})

test('staff tidak bisa approve/reject/assign/reopen', () => {
  for (const a of ['approve', 'reject'] as const)
    expect(canTransition(t('pending'), a, staff).ok).toBe(false)
  expect(canTransition(t('approved', 2), 'assign', staff).ok).toBe(false)
  expect(canTransition(t('done', 2), 'reopen', staff).ok).toBe(false)
})

test('staff tidak bisa mengerjakan tiket orang lain', () => {
  expect(canTransition(t('approved', 2), 'start', other).ok).toBe(false)
  expect(canTransition(t('in_progress', 2), 'done', other).ok).toBe(false)
  // supervisor boleh menutup atas nama tim
  expect(canTransition(t('in_progress', 2), 'done', sup).ok).toBe(true)
})

test('tidak bisa dikerjakan sebelum di-assign', () => {
  expect(canTransition(t('approved', null), 'start', sup).ok).toBe(false)
})

test('lompatan status terlarang', () => {
  expect(canTransition(t('pending', 2), 'done', sup).ok).toBe(false)
  expect(canTransition(t('pending', 2), 'start', sup).ok).toBe(false)
  expect(canTransition(t('done', 2), 'start', sup).ok).toBe(false)
})

test('tiket rejected beku', () => {
  for (const a of ['approve', 'assign', 'start', 'done', 'reopen'] as const)
    expect(canTransition(t('rejected', 2), a, sup).ok).toBe(false)
})

test('tiket terarsip beku terhadap semua aksi', () => {
  const arsip = { status: 'in_progress' as const, assigneeId: 2, archivedAt: 1_700_000_000 }
  for (const a of ['approve', 'reject', 'assign', 'start', 'done', 'reopen'] as const) {
    const r = canTransition(arsip, a, sup)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('diarsipkan')
  }
  // archivedAt null / tidak diisi = tiket normal, tidak ikut terkunci.
  expect(canTransition({ ...arsip, archivedAt: null }, 'done', sup).ok).toBe(true)
  expect(canTransition(t('in_progress', 2), 'done', sup).ok).toBe(true)
})

test('assignee tugas internal: pembuat mengerjakan sendiri', () => {
  expect(resolveAssignee(staff)).toBe(2)
  expect(resolveAssignee(sup)).toBe(1)
})

test('assignee: staff tidak bisa melempar kerja ke rekan lewat API', () => {
  // staff.id === 2, mencoba menunjuk other.id === 3
  expect(resolveAssignee(staff, 3)).toBe(2)
})

test('assignee: supervisor boleh menunjuk orang lain', () => {
  expect(resolveAssignee(sup, 3)).toBe(3)
  expect(resolveAssignee(sup, null)).toBe(1) // tidak menunjuk -> dirinya sendiri
})

test('median jumlah ganjil dan genap', () => {
  expect(median([])).toBe(null)
  expect(median([5])).toBe(5)
  expect(median([3, 1, 2])).toBe(2)
  expect(median([4, 1, 3, 2])).toBe(2.5) // (2+3)/2
})

const HOUR = 3600
const row = (o: Partial<KpiRow>): KpiRow => ({
  assigneeId: 2,
  status: 'done',
  assignedAt: 0,
  doneAt: HOUR,
  dueAt: null,
  reopenCount: 0,
  category: 'bug',
  ...o,
})

test('KPI: median resolution, on-time, reopen, throughput', () => {
  const k = computeKpi(
    [
      row({ doneAt: 1 * HOUR, dueAt: 2 * HOUR }), // 1j, tepat waktu
      row({ doneAt: 3 * HOUR, dueAt: 2 * HOUR }), // 3j, telat
      row({ doneAt: 5 * HOUR, dueAt: null, reopenCount: 2, category: 'maintenance' }), // 5j, no due
      row({ status: 'in_progress', doneAt: null }), // diabaikan semua rasio
    ],
    100 * HOUR,
  )
  expect(k.doneCount).toBe(3)
  expect(k.medianResolutionSec).toBe(3 * HOUR)
  expect(k.onTimeRate).toBe(0.5) // 1 dari 2 yang punya due date — yang tanpa due tidak menghukum
  expect(k.reopenRate).toBeCloseTo(1 / 3)
  expect(k.throughputByCategory).toEqual({ bug: 2, maintenance: 1 })
})

test('KPI: himpunan kosong tidak melempar dan tidak mengarang 0', () => {
  const k = computeKpi([], 0)
  expect(k).toMatchObject({
    doneCount: 0,
    medianResolutionSec: null,
    onTimeRate: null,
    reopenRate: null,
    overdueOpen: 0,
  })
})

test('KPI: overdueOpen hanya tiket hidup yang lewat due date', () => {
  const k = computeKpi(
    [
      row({ status: 'in_progress', doneAt: null, dueAt: 1 * HOUR }), // lewat → hitung
      row({ status: 'approved', doneAt: null, dueAt: 99 * HOUR }), // belum lewat
      row({ status: 'rejected', doneAt: null, dueAt: 1 * HOUR }), // beku, jangan hitung
      row({ doneAt: 9 * HOUR, dueAt: 1 * HOUR }), // sudah selesai (telat), bukan overdue-open
    ],
    10 * HOUR,
  )
  expect(k.overdueOpen).toBe(1)
})

import { sniffImageMime } from './image'

const bytes = (...b: number[]) => new Uint8Array(b)
const pad = (head: number[], n = 32) =>
  new Uint8Array([...head, ...Array(Math.max(0, n - head.length)).fill(0)])

test('sniff mengenali tiga tipe gambar yang diizinkan', () => {
  expect(sniffImageMime(pad([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg')
  expect(sniffImageMime(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png')
  expect(
    sniffImageMime(
      // "RIFF" + 4 byte ukuran + "WEBP"
      pad([0x52, 0x49, 0x46, 0x46, 0x2a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]),
    ),
  ).toBe('image/webp')
})

test('SVG ditolak — XML bisa memuat <script>, itu stored XSS', () => {
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>')
  expect(sniffImageMime(svg)).toBe(null)
})

test('berkas menyamar ditolak walau ekstensinya .png', () => {
  expect(sniffImageMime(new TextEncoder().encode('<?php system($_GET["c"]); ?>'))).toBe(null)
  expect(sniffImageMime(pad([0x7f, 0x45, 0x4c, 0x46]))).toBe(null) // ELF
  expect(sniffImageMime(pad([0x4d, 0x5a]))).toBe(null) // exe DOS/PE
  expect(sniffImageMime(pad([0x50, 0x4b, 0x03, 0x04]))).toBe(null) // zip
  expect(sniffImageMime(pad([0x25, 0x50, 0x44, 0x46]))).toBe(null) // pdf
})

test('buffer kosong atau lebih pendek dari signature tidak bikin crash', () => {
  expect(sniffImageMime(bytes())).toBe(null)
  expect(sniffImageMime(bytes(0xff))).toBe(null)
  expect(sniffImageMime(bytes(0xff, 0xd8))).toBe(null)
  expect(sniffImageMime(bytes(0x89, 0x50, 0x4e))).toBe(null)
  // "RIFF" tapi bukan WebP (mis. WAV) — dan terlalu pendek untuk dicek
  expect(sniffImageMime(bytes(0x52, 0x49, 0x46, 0x46))).toBe(null)
  expect(sniffImageMime(pad([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45]))).toBe(
    null,
  )
})

import { emailDomainAllowed } from './email'

test('domain email: yang sah lolos, apa pun huruf besar-kecilnya', () => {
  expect(emailDomainAllowed('budi@inilah.com', 'inilah.com')).toBe(true)
  expect(emailDomainAllowed('Budi@INILAH.com', 'inilah.com')).toBe(true)
  expect(emailDomainAllowed('budi@inilah.com', 'INILAH.COM')).toBe(true)
})

test('domain email: endsWith() akan bocor di sini — pastikan tidak', () => {
  // Semua ini LOLOS kalau dicek pakai email.endsWith('inilah.com').
  expect(emailDomainAllowed('penyerang@evilinilah.com', 'inilah.com')).toBe(false)
  expect(emailDomainAllowed('penyerang@notinilah.com', 'inilah.com')).toBe(false)
  expect(emailDomainAllowed('budi@sub.inilah.com', 'inilah.com')).toBe(false)
  expect(emailDomainAllowed('budi@inilah.com.evil.id', 'inilah.com')).toBe(false)
  expect(emailDomainAllowed('inilah.com@gmail.com', 'inilah.com')).toBe(false)
})

test('domain email: bentuk rusak ditolak, tidak bikin crash', () => {
  expect(emailDomainAllowed('tanpa-at', 'inilah.com')).toBe(false)
  expect(emailDomainAllowed('@inilah.com', 'inilah.com')).toBe(false)
  expect(emailDomainAllowed('budi@', 'inilah.com')).toBe(false)
  expect(emailDomainAllowed('', 'inilah.com')).toBe(false)
})

test('domain email: allowed kosong berarti bebas', () => {
  expect(emailDomainAllowed('siapa@pun.com', '')).toBe(true)
  expect(emailDomainAllowed('siapa@pun.com', null)).toBe(true)
  expect(emailDomainAllowed('siapa@pun.com', undefined)).toBe(true)
})

import { hashResetToken, makeResetToken, resetTokenState } from './reset-token'

test('token reset: yang disimpan hash, bukan tokennya', () => {
  const { token, tokenHash } = makeResetToken()
  expect(tokenHash).not.toBe(token)
  expect(tokenHash).toMatch(/^[0-9a-f]{64}$/)
  // Hash harus bisa dihitung ulang dari token — dasar pencocokan saat link diklik.
  expect(hashResetToken(token)).toBe(tokenHash)
})

test('token reset: dua token tidak pernah sama', () => {
  const a = makeResetToken()
  const b = makeResetToken()
  expect(a.token).not.toBe(b.token)
  expect(a.tokenHash).not.toBe(b.tokenHash)
  expect(a.token.length).toBeGreaterThanOrEqual(43) // 32 byte base64url
})

test('keadaan token: sah, kedaluwarsa, terpakai, tidak dikenal', () => {
  const now = 1_000_000
  expect(resetTokenState({ expiresAt: now + 60, usedAt: null }, now)).toBe('valid')
  expect(resetTokenState({ expiresAt: now - 1, usedAt: null }, now)).toBe('expired')
  // Tepat di detik kedaluwarsa sudah tidak berlaku — batasnya inklusif.
  expect(resetTokenState({ expiresAt: now, usedAt: null }, now)).toBe('expired')
  expect(resetTokenState(undefined, now)).toBe('unknown')
  expect(resetTokenState(null, now)).toBe('unknown')
})

test('keadaan token: sudah terpakai menang atas belum kedaluwarsa', () => {
  const now = 1_000_000
  // Masih dalam masa berlaku tapi sudah dipakai -> tetap ditolak.
  expect(resetTokenState({ expiresAt: now + 999, usedAt: now - 10 }, now)).toBe('used')
})
