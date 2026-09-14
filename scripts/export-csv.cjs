/**
 * Export database ke CSV yang bisa dibuka di Excel / Google Sheets.
 *
 *   bun run export:csv
 *   OUT=/tmp/x node scripts/export-csv.cjs
 *
 * Beda dengan backup.cjs: itu untuk MEMULIHKAN server (biner, lengkap), ini
 * untuk DIBACA (terpilih, sudah diterjemahkan).
 *
 * TIDAK diekspor:
 *   users.password_hash   hash scrypt — tidak berguna di spreadsheet, dan
 *                         mengekspornya berarti menyebarkannya ke Drive/email
 *   password_resets       token reset berumur 1 jam, tidak ada alasan disebar
 *   __drizzle_migrations  urusan internal skema
 */
const Database = require('better-sqlite3')
const fs = require('node:fs')
const path = require('node:path')
const { toCsv } = require('./csv.cjs')

const SRC = process.env.DATABASE_URL || './data/kepeser.db'
const STAMP = new Date().toISOString().slice(0, 10)
const OUT = process.env.OUT || path.join('./exports', `kepeser-export-${STAMP}`)

/**
 * epoch detik -> "YYYY-MM-DD HH:mm" waktu lokal.
 *
 * Bukan toLocaleString(): "10/9/2026, 16.19" ambigu (tanggal atau bulan dulu?)
 * dan tidak bisa diurutkan sebagai teks di spreadsheet. Bentuk ini terbaca DAN
 * terurut benar.
 */
function waktu(sec) {
  if (!sec) return ''
  const d = new Date(sec * 1000)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

const ya = (v) => (v ? 'ya' : 'tidak')

function tulis(nama, rows, columns) {
  const file = path.join(OUT, nama)
  fs.writeFileSync(file, toCsv(rows, columns))
  console.log(`  ${nama.padEnd(20)} ${String(rows.length).padStart(5)} baris`)
}

function main() {
  if (!fs.existsSync(SRC)) throw new Error(`DB tidak ditemukan: ${SRC}`)
  fs.mkdirSync(OUT, { recursive: true })

  // readonly: perintah ekspor tidak boleh punya kemampuan menulis apa pun.
  const db = new Database(SRC, { readonly: true })

  // Nilai enum (bug, in_progress, …) sengaja TIDAK diterjemahkan: sudah terbaca,
  // stabil untuk pivot/filter di spreadsheet, dan tidak ikut basi kalau label UI berubah.
  const tickets = db
    .prepare(
      `select t.id, t.title, t.description, t.category, t.priority, t.status, t.source,
              t.reporter_name, t.reporter_division,
              a.name as assignee_name, c.name as creator_name,
              t.reject_reason, t.reopen_count, t.image_path,
              t.created_at, t.approved_at, t.assigned_at, t.started_at,
              t.done_at, t.due_at, t.archived_at, t.public_hidden
         from tickets t
         left join users a on a.id = t.assignee_id
         left join users c on c.id = t.created_by
        order by t.id`,
    )
    .all()
    .map((r) => ({
      ...r,
      lampiran: r.image_path ? 'ada' : '',
      dibuka_ulang: r.reopen_count,
      diarsipkan: r.archived_at ? waktu(r.archived_at) : '',
      sembunyi_papan: ya(r.public_hidden),
      dibuat: waktu(r.created_at),
      disetujui: waktu(r.approved_at),
      di_assign: waktu(r.assigned_at),
      mulai: waktu(r.started_at),
      selesai: waktu(r.done_at),
      target_selesai: waktu(r.due_at),
    }))

  const users = db
    // password_hash sengaja tidak ikut di SELECT — bukan disaring belakangan,
    // supaya tidak mungkin bocor karena spread object.
    .prepare('select id, name, email, role, job_title, status, created_at from users order by id')
    .all()
    .map((r) => ({ ...r, dibuat: waktu(r.created_at) }))

  const events = db
    .prepare(
      `select e.id, e.ticket_id, t.title as ticket_title, u.name as actor_name,
              e.type, e.note, e.created_at
         from ticket_events e
         join tickets t on t.id = e.ticket_id
         left join users u on u.id = e.actor_id
        order by e.id`,
    )
    .all()
    .map((r) => ({ ...r, waktu: waktu(r.created_at), actor_name: r.actor_name || '(sistem/publik)' }))

  db.close()

  console.log(`Export -> ${OUT}`)
  tulis('tickets.csv', tickets, [
    { key: 'id', header: 'id' },
    { key: 'title', header: 'judul' },
    { key: 'description', header: 'deskripsi' },
    { key: 'category', header: 'kategori' },
    { key: 'priority', header: 'prioritas' },
    { key: 'status', header: 'status' },
    { key: 'source', header: 'sumber' },
    { key: 'reporter_name', header: 'pelapor' },
    { key: 'reporter_division', header: 'divisi_pelapor' },
    { key: 'assignee_name', header: 'penanggung_jawab' },
    { key: 'creator_name', header: 'dibuat_oleh' },
    { key: 'reject_reason', header: 'alasan_ditolak' },
    { key: 'dibuka_ulang', header: 'dibuka_ulang' },
    { key: 'lampiran', header: 'lampiran' },
    { key: 'dibuat', header: 'dibuat' },
    { key: 'disetujui', header: 'disetujui' },
    { key: 'di_assign', header: 'di_assign' },
    { key: 'mulai', header: 'mulai_dikerjakan' },
    { key: 'selesai', header: 'selesai' },
    { key: 'target_selesai', header: 'target_selesai' },
    { key: 'diarsipkan', header: 'diarsipkan' },
    { key: 'sembunyi_papan', header: 'disembunyikan_dari_papan' },
  ])
  tulis('users.csv', users, [
    { key: 'id', header: 'id' },
    { key: 'name', header: 'nama' },
    { key: 'email', header: 'email' },
    { key: 'role', header: 'peran' },
    { key: 'job_title', header: 'jabatan' },
    { key: 'status', header: 'status' },
    { key: 'dibuat', header: 'dibuat' },
  ])
  tulis('ticket_events.csv', events, [
    { key: 'id', header: 'id' },
    { key: 'ticket_id', header: 'tiket_id' },
    { key: 'ticket_title', header: 'judul_tiket' },
    { key: 'waktu', header: 'waktu' },
    { key: 'actor_name', header: 'aktor' },
    { key: 'type', header: 'tipe' },
    { key: 'note', header: 'catatan' },
  ])
  console.log('\n✓ Selesai. Buka di Excel atau Google Sheets.')
}

try {
  main()
} catch (e) {
  console.error('\n✗ GAGAL:', e.message)
  process.exit(1)
}
