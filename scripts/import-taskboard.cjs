/**
 * Impor papan task Google Sheets ke Kepeser.
 *
 *   CSV="~/Downloads/Task Board IT inilah.com - Backend.csv" \
 *   DATABASE_URL=./kepeser.db node scripts/import-taskboard.cjs
 *
 * Aman dijalankan ulang: baris yang judul + tanggal-buatnya sudah ada dilewati.
 */
const Database = require('better-sqlite3')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { parseCsv } = require('./csv.cjs')

const SRC = process.env.DATABASE_URL || './kepeser.db'
const CSV =
  process.env.CSV ||
  path.join(process.env.HOME, 'Downloads', 'Task Board IT inilah.com - Backend.csv')
const ASAL = 'Task Board IT inilah.com — Backend'

// Jam kerja. Sumbernya cuma punya TANGGAL, dan 115 dari 207 baris mulai & selesai
// di hari yang sama — kalau jamnya 00:00 semua, durasinya 0 detik dan KPI "median
// waktu penyelesaian" jadi nol yang menyesatkan. Ini perkiraan, bukan data terukur,
// dan ditulis apa adanya di tiap tiket.
const JAM_MULAI = 9
const JAM_SELESAI = 17

// --- pemetaan (murni, ditest) ---------------------------------------------

const STATUS = { Done: 'done', 'Ready To Review': 'in_progress', Cancelled: 'rejected' }
const PRIORITAS = { High: 'high', Medium: 'normal', Low: 'low' }

const POLA_BUG = /\b(fix|fixing|perbaiki|perbaikan|bug|error|gagal)\b/i

/**
 * Enam baris tempat aturan kata kunci meleset dari pembacaan manual seluruh
 * 207 baris. Ditulis eksplisit, bukan disembunyikan di dalam regex.
 */
const KECUALI = {
  26: 'request_fitur', // "Sync branch staging" — chore, bukan perbaikan cacat
  165: 'request_fitur', // "GenerateSitemap asynchronous + logging error"
  178: 'request_fitur', // "Validasi URL + perbaikan instruksi prompt"
  189: 'request_fitur', // "SMTP dengan TLS + error handling"
  35: 'bug', // "Email yang di kirim kosong" — cacat, tanpa kata "fix"
  47: 'bug', // "Non blocking elasticsearch" — app ikut mati, itu cacat
  109: 'bug', // "Page is not indexed: Duplicate without canonical" — cacat indexing GSC
}

function kategoriDari(judul, deskripsi, nomor) {
  if (KECUALI[nomor]) return KECUALI[nomor]
  return POLA_BUG.test(`${judul} ${deskripsi}`) ? 'bug' : 'request_fitur'
}

/** "1/20/2026" + jam -> epoch detik, waktu LOKAL (bukan UTC — jangan geser sehari). */
function tanggalKeEpoch(s, jam) {
  const t = (s || '').trim()
  if (!t) return null
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const [, bulan, hari, tahun] = m
  const d = new Date(Number(tahun), Number(bulan) - 1, Number(hari), jam, 0, 0, 0)
  return Number.isNaN(d.getTime()) ? null : Math.floor(d.getTime() / 1000)
}

/** Nama PIC di sheet -> email akun. Nama pertama = penanggung jawab utama. */
const PIC = { azriel: 'azriel.fauzi.h@inilah.com', danu: 'ardanu@inilah.com', 'mas egi': 'egi@inilah.com' }

function pecahPic(s) {
  return (s || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

module.exports = { kategoriDari, tanggalKeEpoch, pecahPic, STATUS, PRIORITAS, KECUALI }

// --- eksekusi --------------------------------------------------------------

if (require.main !== module) return

function token() {
  return Array.from(crypto.randomBytes(16), (x) => x.toString(36).padStart(2, '0')).join('')
}

async function hashTakTerpakai() {
  // Hash scrypt dari password acak 64 karakter yang tidak pernah ada yang tahu.
  // Akunnya muncul di sistem tapi tidak bisa dipakai login sampai supervisor
  // menetapkan password lewat /admin/users.
  const { Hash } = require('@adonisjs/hash')
  const { Scrypt } = require('@adonisjs/hash/drivers/scrypt')
  return new Hash(new Scrypt({})).make(crypto.randomBytes(48).toString('base64url'))
}

async function main() {
  if (!fs.existsSync(SRC)) throw new Error(`DB tidak ditemukan: ${SRC}`)
  if (!fs.existsSync(CSV)) throw new Error(`CSV tidak ditemukan: ${CSV}`)

  const baris = parseCsv(fs.readFileSync(CSV, 'utf8'))
  const db = new Database(SRC)
  db.pragma('foreign_keys = ON')

  const cariUser = db.prepare('select id, name from users where email = ?')
  const supervisor = db.prepare("select id from users where role = 'supervisor' order by id").get()
  if (!supervisor) throw new Error('Tidak ada akun supervisor di DB ini.')

  // Akun yang belum ada dibuat lebih dulu supaya assignee-nya bisa dirujuk.
  const akun = {}
  for (const [nama, email] of Object.entries(PIC)) {
    let u = cariUser.get(email)
    if (!u) {
      const namaTampil = nama === 'mas egi' ? 'Egi' : nama.replace(/\b\w/g, (c) => c.toUpperCase())
      db.prepare(
        `insert into users (email, name, role, job_title, status, password_hash)
         values (?, ?, 'staff', 'backend', 'active', ?)`,
      ).run(email, namaTampil, await hashTakTerpakai())
      u = cariUser.get(email)
      console.log(`  + akun dibuat: ${namaTampil} <${email}> (password belum diset)`)
    }
    akun[nama] = u
  }

  /**
   * Kunci dedup: judul + deskripsi LENGKAP (yang sudah memuat "Tanggal asli X").
   *
   * Bukan judul+created_at, karena dua alasan yang dua-duanya sudah menggigit:
   *  - dua task BERBEDA bisa berjudul sama di hari yang sama
   *    ("Sitemap mozaik pakai sub category", 27 Jan — satu generate, satu webhook);
   *  - 5 baris tidak punya tanggal sama sekali, jadi created_at-nya jatuh ke
   *    waktu impor yang berubah tiap kali dijalankan.
   * Deskripsi lengkap stabil lintas eksekusi dan tetap membedakan keduanya.
   */
  const sudahAda = db.prepare('select 1 from tickets where title = ? and description = ?')
  const sisip = db.prepare(
    `insert into tickets
      (public_token, source, reporter_name, reporter_division, title, description,
       category, priority, status, assignee_id, created_by,
       created_at, approved_at, assigned_at, started_at, done_at, updated_at)
     values (?, 'internal', ?, 'IT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const jejak = db.prepare(
    `insert into ticket_events (ticket_id, actor_id, type, note, created_at) values (?, ?, 'created', ?, ?)`,
  )

  const lap = { sisip: 0, lewat: 0, bug: 0, fitur: 0, tanpaTanggal: [], tanpaSelesai: [] }

  db.transaction(() => {
    baris.forEach((r, i) => {
      const nomor = i + 1
      const judul = (r['x'] || '').trim()
      if (!judul) return

      const mulai = tanggalKeEpoch(r['Start Date'], JAM_MULAI)
      const deskAsli = (r['Deskripsi Task'] || '').trim()
      const kategori = kategoriDari(judul, deskAsli, nomor)
      const status = STATUS[(r['Status'] || '').trim()] || 'approved'
      const selesai = tanggalKeEpoch(r['Waktu Selesai'], JAM_SELESAI)

      const pics = pecahPic(r['PIC'])
      const utama = akun[(pics[0] || '').toLowerCase()] || akun.azriel
      const rekan = pics.slice(1).map((p) => akun[p.toLowerCase()]?.name).filter(Boolean)

      // Kolom yang tidak punya tempat di skema disisipkan ke deskripsi, bukan dibuang.
      const bagian = [deskAsli]
      if ((r['Catatan'] || '').trim()) bagian.push(`Catatan: ${r['Catatan'].trim()}`)
      if ((r['LInk PR/Docs'] || '').trim()) bagian.push(`PR/Docs: ${r['LInk PR/Docs'].trim()}`)
      if (rekan.length) bagian.push(`Dikerjakan bersama: ${rekan.join(', ')}`)
      bagian.push(
        `———\nDiimpor dari "${ASAL}".\n` +
          `Tanggal asli ${r['Start Date'] || '-'}; jam ${JAM_MULAI}:00–${JAM_SELESAI}:00 adalah perkiraan, bukan data terukur.`,
      )
      const deskripsi = bagian.filter(Boolean).join('\n\n')

      if (sudahAda.get(judul, deskripsi)) { lap.lewat++; return }

      // created_at NOT NULL. 5 baris di sheet tidak punya tanggal sama sekali —
      // dipakai tanggal selesai, lalu waktu impor. assigned_at DIBIARKAN null
      // supaya baris tanpa tanggal tidak ikut mencemari KPI waktu penyelesaian
      // dengan durasi karangan.
      const dibuat = mulai || selesai || Math.floor(Date.now() / 1000)

      const info = sisip.run(
        token(), utama.name, judul, deskripsi,
        kategori, PRIORITAS[(r['Priority'] || '').trim()] || 'normal', status,
        utama.id, supervisor.id,
        dibuat, dibuat, mulai,
        status === 'done' || status === 'in_progress' ? mulai : null,
        status === 'done' ? selesai : null,
        selesai || dibuat,
      )
      jejak.run(info.lastInsertRowid, supervisor.id, `Diimpor dari ${ASAL}`, dibuat)

      lap.sisip++
      kategori === 'bug' ? lap.bug++ : lap.fitur++
      if (!mulai) lap.tanpaTanggal.push(`#${nomor} ${judul}`)
      else if (status === 'done' && !selesai) lap.tanpaSelesai.push(`#${nomor} ${judul}`)
    })
  })()

  console.log(`\n  disisipkan : ${lap.sisip}  (${lap.bug} bug · ${lap.fitur} request_fitur)`)
  console.log(`  dilewati   : ${lap.lewat} (sudah ada)`)
  if (lap.tanpaTanggal.length) {
    console.log(`\n  ⚠ ${lap.tanpaTanggal.length} baris tanpa tanggal — tidak ikut terhitung di KPI:`)
    lap.tanpaTanggal.forEach((t) => console.log(`      ${t}`))
  }
  if (lap.tanpaSelesai.length) {
    console.log(`\n  ⚠ ${lap.tanpaSelesai.length} baris Done tanpa tanggal selesai:`)
    lap.tanpaSelesai.forEach((t) => console.log(`      ${t}`))
  }
  console.log(`\n  total tiket sekarang: ${db.prepare('select count(*) c from tickets').get().c}`)
  db.close()
}

main().catch((e) => { console.error('\n✗ GAGAL:', e.message); process.exit(1) })
