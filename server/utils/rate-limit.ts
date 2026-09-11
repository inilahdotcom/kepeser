import type { H3Event } from 'h3'

type Bucket = { tokens: number; last: number }

// ponytail: in-memory, reset saat restart. Benar untuk 1 instance (yang memang
// arsitekturnya). Pindah ke tabel SQLite kalau nanti jalan multi-instance.
const buckets = new Map<string, Bucket>()

export function rateLimit(event: H3Event, key: string, perMinute: number, burst = perMinute) {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const id = `${key}:${ip}`
  const now = Date.now()
  const b = buckets.get(id) ?? { tokens: burst, last: now }

  b.tokens = Math.min(burst, b.tokens + ((now - b.last) / 60_000) * perMinute)
  b.last = now

  if (b.tokens < 1) {
    buckets.set(id, b)
    throw createError({
      statusCode: 429,
      statusMessage: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.',
    })
  }

  b.tokens -= 1
  buckets.set(id, b)

  // Buang bucket dingin supaya map tidak tumbuh selamanya.
  if (buckets.size > 5000)
    for (const [k, v] of buckets) if (now - v.last > 600_000) buckets.delete(k)
}
