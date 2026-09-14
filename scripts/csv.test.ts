import { expect, test } from 'bun:test'
import { BOM, csvCell, toCsv } from './csv.cjs'

test('isi biasa tidak dibungkus kutip', () => {
  expect(csvCell('Dewi Lestari')).toBe('Dewi Lestari')
  expect(csvCell('bug')).toBe('bug')
})

test('koma, kutip, dan baris baru dibungkus', () => {
  expect(csvCell('a,b')).toBe('"a,b"')
  expect(csvCell('baris1\nbaris2')).toBe('"baris1\nbaris2"')
  expect(csvCell('baris1\r\nbaris2')).toBe('"baris1\r\nbaris2"')
})

test('kutip ganda di dalam isi digandakan', () => {
  expect(csvCell('dia bilang "halo"')).toBe('"dia bilang ""halo"""')
  // Kutip DAN koma sekaligus — kombinasi yang paling sering salah.
  expect(csvCell('dia bilang "halo", lalu pergi')).toBe('"dia bilang ""halo"", lalu pergi"')
})

test('null dan undefined jadi sel kosong', () => {
  expect(csvCell(null)).toBe('')
  expect(csvCell(undefined)).toBe('')
  expect(csvCell('')).toBe('')
})

test('angka 0 dan false TIDAK jadi kosong — jebakan `value || ""`', () => {
  expect(csvCell(0)).toBe('0')
  expect(csvCell(false)).toBe('false')
  expect(csvCell(14)).toBe('14')
})

test('toCsv: header, urutan kolom, BOM, dan CRLF', () => {
  const out = toCsv([{ id: 1, nama: 'Dewi' }], [
    { key: 'id', header: 'ID' },
    { key: 'nama', header: 'Nama' },
  ])
  expect(out.startsWith(BOM)).toBe(true)
  expect(out).toBe(`${BOM}ID,Nama\r\n1,Dewi\r\n`)
})

test('toCsv: satu baris yang memuat semua jebakan sekaligus tetap satu baris', () => {
  const jahat = 'Judul, dengan "kutip"\ndan baris baru'
  const out = toCsv([{ a: jahat, b: 0 }], [
    { key: 'a', header: 'Judul' },
    { key: 'b', header: 'Jumlah' },
  ])
  // Baris baru di dalam sel HARUS berada di dalam tanda kutip, bukan memecah baris.
  expect(out).toBe(`${BOM}Judul,Jumlah\r\n"Judul, dengan ""kutip""\ndan baris baru",0\r\n`)
})

test('kolom yang tidak ada di data jadi kosong, bukan "undefined"', () => {
  const out = toCsv([{ a: 1 }], [
    { key: 'a', header: 'A' },
    { key: 'tidakAda', header: 'B' },
  ])
  expect(out).toBe(`${BOM}A,B\r\n1,\r\n`)
})

import { parseCsv } from './csv.cjs'

test('parseCsv: dasar — header jadi kunci', () => {
  expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([{ a: '1', b: '2' }])
  expect(parseCsv('a,b\n1,2\n')).toEqual([{ a: '1', b: '2' }])
})

test('parseCsv: koma, kutip, dan baris baru di dalam sel tidak memecah baris', () => {
  const csv = 'judul,jumlah\r\n"Judul, dengan ""kutip""\ndan baris baru",0\r\n'
  expect(parseCsv(csv)).toEqual([
    { judul: 'Judul, dengan "kutip"\ndan baris baru', jumlah: '0' },
  ])
})

test('parseCsv: bolak-balik dengan toCsv tetap utuh', () => {
  const asli = [{ a: 'x,y', b: 'dia bilang "halo"', c: 'baris1\nbaris2' }]
  const kolom = [
    { key: 'a', header: 'a' },
    { key: 'b', header: 'b' },
    { key: 'c', header: 'c' },
  ]
  expect(parseCsv(toCsv(asli, kolom))).toEqual(asli)
})

test('parseCsv: BOM dibuang, sel kosong tetap ada, baris kosong dilewati', () => {
  expect(parseCsv(`${BOM}a,b\r\n1,\r\n\r\n`)).toEqual([{ a: '1', b: '' }])
})

test('parseCsv: kolom kurang diisi string kosong, bukan undefined', () => {
  expect(parseCsv('a,b,c\r\n1,2\r\n')).toEqual([{ a: '1', b: '2', c: '' }])
})
