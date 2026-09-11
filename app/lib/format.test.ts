import { expect, test } from 'bun:test'
import { EMPTY_KEY, selectKey, selectValueFromKey, toOptions } from './format'

const RANGE = [
  { value: 7, label: '7 hari' },
  { value: 30, label: '30 hari' },
]
const FILTER = [
  { value: '', label: 'Semua status' },
  { value: 'done', label: 'Selesai' },
]

test('string kosong dipetakan ke sentinel — reka-ui menolak SelectItem bernilai ""', () => {
  expect(selectKey('')).toBe(EMPTY_KEY)
  expect(selectKey('done')).toBe('done')
  expect(selectKey(30)).toBe('30')
})

test('opsi bertipe number kembali sebagai number, bukan string', () => {
  const v = selectValueFromKey(RANGE, '30')
  expect(v).toBe(30)
  expect(typeof v).toBe('number')
})

test('nilai "semua" bolak-balik lewat sentinel tanpa berubah', () => {
  expect(selectValueFromKey(FILTER, selectKey(''))).toBe('')
  expect(selectValueFromKey(FILTER, selectKey('done'))).toBe('done')
})

test('key tidak dikenal jatuh ke "" — bukan undefined yang bikin query rusak', () => {
  expect(selectValueFromKey(RANGE, 'ngawur')).toBe('')
  expect(selectValueFromKey(RANGE, undefined)).toBe('')
})

test('toOptions memakai label, dan jatuh ke key kalau labelnya tidak ada', () => {
  expect(toOptions(['bug'], { bug: 'Bug / Error' })).toEqual([{ value: 'bug', label: 'Bug / Error' }])
  expect(toOptions(['aneh'], {})).toEqual([{ value: 'aneh', label: 'aneh' }])
})

import { dateTimeInputToEpoch, epochToDateTimeInput } from './format'

test('datetime-local bolak-balik tanpa geser — ini bug UTC yang diperbaiki', () => {
  // Jam 05:00 lokal: toISOString() akan memundurkannya sehari di UTC+7.
  const s = '2026-03-15T05:00'
  expect(epochToDateTimeInput(dateTimeInputToEpoch(s))).toBe(s)
  // Jam larut, sisi seberang batas hari.
  const t = '2026-03-15T23:30'
  expect(epochToDateTimeInput(dateTimeInputToEpoch(t))).toBe(t)
})

test('tanggal tanpa jam jatuh ke 17:00, bukan 00:00', () => {
  expect(epochToDateTimeInput(dateTimeInputToEpoch('2026-03-15'))).toBe('2026-03-15T17:00')
})

test('kosong tetap kosong di dua arah', () => {
  expect(dateTimeInputToEpoch('')).toBe(null)
  expect(epochToDateTimeInput(null)).toBe('')
  expect(epochToDateTimeInput(undefined)).toBe('')
})
