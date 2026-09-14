/**
 * Cadangan lengkap: snapshot DB yang konsisten + pemeriksaan lampiran.
 *
 *   node scripts/backup.cjs
 *
 * Kenapa tidak `cp kepeser.db` saja: DB ini memakai WAL (lihat
 * server/db/client.ts), jadi tulisan terbaru menggantung di berkas `-wal` dan
 * belum tentu ada di `.db`. Menyalin berkasnya saat aplikasi menulis bisa
 * menghasilkan snapshot basi atau korup. `db.backup()` memakai API backup bawaan
 * SQLite — konsisten walau ada tulisan berjalan, dan WAL ikut ter-checkpoint
 * sehingga hasilnya satu berkas tunggal tanpa -wal/-shm.
 *
 * Lampiran gambar TIDAK ada di dalam DB: kolom tickets.image_path cuma menyimpan
 * nama berkas, isinya di UPLOAD_DIR. Keduanya harus ikut atau cadangannya bohong.
 *
 * .cjs disengaja — sama seperti set-user.cjs: package.json memakai
 * "type": "module", tapi image runtime Docker tidak menyalinnya sama sekali.
 */
const Database = require('better-sqlite3')
const fs = require('node:fs')
const path = require('node:path')

const SRC = process.env.DATABASE_URL || './data/kepeser.db'
const UPLOADS = process.env.UPLOAD_DIR || path.join(path.dirname(SRC), 'uploads')
const OUT_DIR = process.env.BACKUP_DIR || path.join(path.dirname(SRC), '_backup')
const DEST = path.join(OUT_DIR, path.basename(SRC))

const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB'

function tableCounts(db) {
  const tables = db
    .prepare("select name from sqlite_master where type = 'table' and name not like 'sqlite_%'")
    .all()
    .map((t) => t.name)
    .sort()
  return Object.fromEntries(
    tables.map((t) => [t, db.prepare(`select count(*) c from "${t}"`).get().c]),
  )
}

async function main() {
  if (!fs.existsSync(SRC)) throw new Error(`DB tidak ditemukan: ${SRC}`)

  // Kalau belum pernah ada lampiran, direktorinya belum ada dan `docker compose cp`
  // akan gagal. Satu baris ini menutup kelas kegagalan itu.
  fs.mkdirSync(UPLOADS, { recursive: true })
  fs.rmSync(OUT_DIR, { recursive: true, force: true })
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const src = new Database(SRC, { readonly: true })
  const sebelum = tableCounts(src)

  await src.backup(DEST)

  // Snapshot yang belum diperiksa bukan cadangan.
  // Dibuka writable supaya bisa dipindah ke journal_mode DELETE: artefak cadangan
  // sebaiknya SATU berkas tunggal, tanpa -wal/-shm yang gampang tertinggal saat
  // disalin. Aplikasi menyalakan WAL lagi sendiri waktu DB ini dipulihkan
  // (server/db/client.ts).
  const out = new Database(DEST)
  out.pragma('journal_mode = DELETE')
  const sesudah = tableCounts(out)

  console.log('Tabel:')
  let beda = false
  for (const t of Object.keys(sebelum)) {
    const cocok = sebelum[t] === sesudah[t]
    if (!cocok) beda = true
    console.log(
      `  ${t.padEnd(22)} ${String(sebelum[t]).padStart(6)} baris` +
        (cocok ? '' : `  ← HASIL BEDA: ${sesudah[t]}`),
    )
  }
  if (beda) throw new Error('Jumlah baris sumber dan hasil tidak sama — cadangan TIDAK sah.')

  // Sanity check tambahan: SQLite sendiri yang menilai integritas berkasnya.
  const ok = out.pragma('integrity_check', { simple: true })
  if (ok !== 'ok') throw new Error(`integrity_check gagal: ${ok}`)

  // --- lampiran, diperiksa dua arah ---
  const dirujuk = new Set(
    out
      .prepare('select image_path from tickets where image_path is not null')
      .all()
      .map((r) => r.image_path),
  )
  const diDisk = new Set(fs.readdirSync(UPLOADS).filter((f) => !f.startsWith('.')))

  const hilang = [...dirujuk].filter((f) => !diDisk.has(f))
  const yatim = [...diDisk].filter((f) => !dirujuk.has(f))

  console.log(`\nLampiran: ${diDisk.size} berkas di disk, ${dirujuk.size} dirujuk tiket`)
  if (hilang.length) {
    // Ini masalah data yang SUDAH ada di sumber, bukan cacat cadangannya. Cadangan
    // tetap dibuat — memblokirnya justru menahan data user tanpa memperbaiki apa pun.
    console.log(`\n  ⚠  ${hilang.length} berkas dirujuk tiket tapi TIDAK ADA di disk:`)
    for (const f of hilang.slice(0, 10)) console.log(`       ${f}`)
    if (hilang.length > 10) console.log(`       … dan ${hilang.length - 10} lagi`)
    console.log('     (masalah ini sudah ada di server, bukan akibat proses cadangan)')
  }
  if (yatim.length) console.log(`  ℹ  ${yatim.length} berkas di disk tidak dirujuk tiket mana pun`)

  // Tutup dulu SEBELUM memeriksa berkas sampingan — koneksi yang masih terbuka
  // selalu menyisakan berkas sementara dan bikin salah alarm.
  src.close()
  out.close()

  const sisaWal = ['-wal', '-shm', '-journal'].filter((s) => fs.existsSync(DEST + s))
  if (sisaWal.length)
    throw new Error(
      `Hasil masih menyisakan ${sisaWal.join(', ')} — checkpoint tidak bersih, jangan dipakai.`,
    )

  console.log(`\n✓ Snapshot siap: ${DEST} (${mb(fs.statSync(DEST).size)})`)
  console.log('  integrity_check: ok · satu berkas tunggal · jumlah baris cocok')
}

main().catch((e) => {
  console.error('\n✗ GAGAL:', e.message)
  process.exit(1)
})
