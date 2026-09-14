/**
 * Ubah nama / email satu akun langsung di DB.
 *
 * Email tidak ada di `updateUserSchema` (server/utils/validation.ts), jadi API
 * maupun UI tidak bisa mengubahnya — email itu identitas login. Skrip ini
 * jalur manualnya, untuk dipakai sesekali oleh admin server.
 *
 *   ID=1 EMAIL=baru@inilah.com NAMA="Nama Baru" node scripts/set-user.cjs
 *
 * .cjs disengaja: package.json memakai "type": "module", tapi image runtime
 * Docker tidak menyalin package.json sama sekali. Ekstensi .cjs membuatnya
 * selalu CommonJS di dua tempat itu.
 */
const Database = require('better-sqlite3')

const url = process.env.DATABASE_URL || './data/kepeser.db'
const id = Number(process.env.ID)
const email = process.env.EMAIL
const nama = process.env.NAMA

if (!Number.isInteger(id)) throw new Error('Set ID=<angka>.')
if (!email && !nama) throw new Error('Set EMAIL dan/atau NAMA.')

const db = new Database(url)
const kolom = 'id, email, name, role, status'

const sebelum = db.prepare(`select ${kolom} from users where id = ?`).get(id)
if (!sebelum) throw new Error(`Tidak ada user dengan id ${id} di ${url}`)

if (email) {
  // Ada indeks unik di email. Cek dulu supaya pesannya jelas, bukan UNIQUE constraint.
  const bentrok = db.prepare('select id from users where email = ? and id <> ?').get(email, id)
  if (bentrok) throw new Error(`Email ${email} sudah dipakai user id ${bentrok.id}`)
}

db.prepare('update users set email = coalesce(?, email), name = coalesce(?, name) where id = ?').run(
  email ?? null,
  nama ?? null,
  id,
)

console.log('sebelum :', sebelum)
console.log('sesudah :', db.prepare(`select ${kolom} from users where id = ?`).get(id))
console.log('\nPassword TIDAK diubah. Logout lalu login lagi dengan email baru.')
