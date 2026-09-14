/**
 * Penulis CSV sesuai RFC 4180.
 *
 * Deskripsi tiket berisi teks bebas: koma, tanda kutip, dan baris baru. Satu
 * baris baru yang tidak di-escape memecah satu baris jadi dua dan menggeser
 * seluruh sisa berkas — rusak diam-diam, baru ketahuan setelah angkanya dipakai
 * mengambil keputusan. Karena itu bagian ini dipisah dan dites.
 *
 * .cjs supaya bisa dipakai `node` polos di dalam container, sama seperti
 * set-user.cjs dan backup.cjs. `bun test` tetap bisa mengimpornya.
 */

/** BOM UTF-8. Tanpa ini Excel di Windows membaca UTF-8 sebagai Latin-1. */
const BOM = '﻿'

function csvCell(value) {
  // Sengaja `== null`, bukan `!value`: angka 0 dan false adalah data yang sah,
  // dan `value || ''` akan mengubahnya jadi sel kosong.
  if (value === null || value === undefined) return ''
  const s = String(value)
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

function csvRow(values) {
  return values.map(csvCell).join(',')
}

/**
 * @param rows  array objek
 * @param columns  [{ key, header }] — urutan & nama kolom di berkas
 */
function toCsv(rows, columns) {
  const lines = [csvRow(columns.map((c) => c.header))]
  for (const row of rows) lines.push(csvRow(columns.map((c) => row[c.key])))
  // CRLF: pemisah baris yang paling luas diterima, termasuk Excel lawas.
  return BOM + lines.join('\r\n') + '\r\n'
}

/**
 * Pembaca CSV sesuai RFC 4180 — kebalikan toCsv().
 *
 * Dipakai mengimpor papan task dari Google Sheets, yang isinya penuh koma,
 * tanda kutip, dan baris baru di dalam sel. Parser naif (split koma / split
 * baris) akan memecah baris di tempat yang salah dan menggeser seluruh sisa
 * berkas tanpa error — jadi bagian ini dipisah dan dites.
 *
 * Mengembalikan array objek, kunci diambil dari baris header.
 */
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1) // buang BOM kalau ada
  const rows = []
  let row = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ }  // "" -> satu kutip
        else quoted = false
      } else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\r' && text[i + 1] === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++ }
    else if (c === '\n' || c === '\r') { row.push(cell); rows.push(row); row = []; cell = '' }
    else cell += c
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }

  const [header, ...data] = rows
  if (!header) return []
  return data
    // Baris kosong di akhir berkas jangan jadi objek hampa.
    .filter((r) => r.some((v) => v !== ''))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])))
}

module.exports = { BOM, csvCell, csvRow, toCsv, parseCsv }
