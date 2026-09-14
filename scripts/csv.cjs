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

module.exports = { BOM, csvCell, csvRow, toCsv }
