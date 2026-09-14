import { expect, test } from 'bun:test'
import { kategoriDari, tanggalKeEpoch, pecahPic, STATUS, PRIORITAS, KECUALI } from './import-taskboard.cjs'

test('kategori: kata perbaikan -> bug, selain itu -> request_fitur', () => {
  expect(kategoriDari('Fix internal server error', 'Fixing error saat call api', 9)).toBe('bug')
  expect(kategoriDari('Perbaiki jadwal sholat', '', 65)).toBe('bug')
  expect(kategoriDari('Create api analytic', 'Buat 1 api untuk statistic', 59)).toBe('request_fitur')
  expect(kategoriDari('World cup 2026 teams', 'Create world cup teams API', 108)).toBe('request_fitur')
})

test('kategori: enam pengecualian menang atas aturan kata kunci', () => {
  // Aturan akan bilang "bug" (ada kata error/perbaikan), tapi ini kerja fitur.
  expect(kategoriDari('SMTP dengan TLS + error handling', '', 189)).toBe('request_fitur')
  expect(kategoriDari('GenerateSitemap asynchronous + logging error', '', 165)).toBe('request_fitur')
  // Aturan tidak kena kata kunci apa pun, tapi ini jelas cacat.
  expect(kategoriDari('Email yang di kirim kosong', 'Tambahkan validation', 35)).toBe('bug')
  expect(kategoriDari('Non blocking elasticsearch', 'app jangan ikut mati', 47)).toBe('bug')
  // Cacat tanpa satu pun kata kunci perbaikan.
  expect(kategoriDari('Page is not indexed: Duplicate without canonical', 'Avoid differences in URL', 109)).toBe('bug')
  expect(Object.keys(KECUALI)).toHaveLength(7)
})

test('kategori: nomor baris lain tidak ikut kena pengecualian', () => {
  // Judul yang sama persis, tapi di baris berbeda -> aturan biasa yang berlaku.
  expect(kategoriDari('SMTP dengan TLS + error handling', '', 999)).toBe('bug')
})

test('tanggal: M/D/YYYY jadi epoch LOKAL, jam sesuai permintaan', () => {
  const t = tanggalKeEpoch('1/20/2026', 9)
  const d = new Date(t! * 1000)
  expect(d.getFullYear()).toBe(2026)
  expect(d.getMonth()).toBe(0) // Januari
  expect(d.getDate()).toBe(20) // tidak geser ke 19 karena UTC
  expect(d.getHours()).toBe(9)
})

test('tanggal: bulan/hari tidak tertukar (12/3 = 3 Desember, bukan 12 Maret)', () => {
  const d = new Date(tanggalKeEpoch('12/3/2026', 17)! * 1000)
  expect(d.getMonth()).toBe(11)
  expect(d.getDate()).toBe(3)
  expect(d.getHours()).toBe(17)
})

test('tanggal: kosong dan bentuk aneh jadi null, bukan NaN', () => {
  expect(tanggalKeEpoch('', 9)).toBe(null)
  expect(tanggalKeEpoch('-', 9)).toBe(null)
  expect(tanggalKeEpoch('2026-01-20', 9)).toBe(null)
  expect(tanggalKeEpoch(undefined as any, 9)).toBe(null)
})

test('PIC: nama pertama jadi penanggung jawab utama', () => {
  expect(pecahPic('Azriel')).toEqual(['Azriel'])
  expect(pecahPic('Azriel, Mas Egi')).toEqual(['Azriel', 'Mas Egi'])
  expect(pecahPic('Azriel, Danu')).toEqual(['Azriel', 'Danu'])
  expect(pecahPic('')).toEqual([])
})

test('status & prioritas dipetakan lengkap', () => {
  expect(STATUS['Done']).toBe('done')
  expect(STATUS['Ready To Review']).toBe('in_progress')
  expect(STATUS['Cancelled']).toBe('rejected')
  expect(PRIORITAS['High']).toBe('high')
  expect(PRIORITAS['Medium']).toBe('normal') // sengaja normal, bukan medium
  expect(PRIORITAS['Low']).toBe('low')
})
