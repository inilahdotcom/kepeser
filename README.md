# Kepeser

Sistem ticket monitoring & task management tim IT inilah.com.

Siapa pun di perusahaan bisa lapor issue tanpa akun. Supervisor IT approve atau tolak,
lalu assign ke staff dengan target selesai. Staff mengerjakan; setiap perubahan tercatat.
Supervisor memantau KPI tiap staff, staff melihat KPI dirinya sendiri.

## Stack

Satu proses, satu file database, satu deploy.

| Lapis | Pilihan |
|---|---|
| App + API | Nuxt 4 (server routes Nitro) — tidak ada backend terpisah |
| Runtime | Node 24 (Bun dipakai sebagai package manager saja) |
| DB | SQLite (WAL) + Drizzle, driver `better-sqlite3` |
| Auth | `nuxt-auth-utils` — sesi cookie tersegel, password scrypt |
| UI | shadcn-vue + Tailwind v4, token dari `DESIGN.md` |
| PWA | `@vite-pwa/nuxt` |

## Mulai

```bash
bun install
cp .env.example .env      # isi NUXT_SESSION_PASSWORD (min 32 karakter) + akun supervisor
bun run db:migrate        # wajib sebelum start pertama
bun run dev               # http://localhost:2112
```

Akun supervisor pertama dibuat otomatis saat boot dari `SEED_SUPERVISOR_*` — hanya kalau
tabel `users` masih kosong. Setelah itu tambah staff lewat `/admin/users`.

```bash
bun test                  # logika transisi status + perhitungan KPI
bun run typecheck
bun run build && bun run start
```

## Deploy

> **Syarat reverse proxy:** batas ukuran body harus diset di proxy, bukan cuma di aplikasi
> — guard 5 MB di app baru bekerja setelah body ter-buffer. Di nginx:
> `client_max_body_size 6m;`

```bash
export NUXT_SESSION_PASSWORD=$(openssl rand -base64 32)
export SEED_SUPERVISOR_EMAIL=supervisor@inilah.com
export SEED_SUPERVISOR_PASSWORD=<password-awal>
docker compose up -d --build
```

`migrate` jalan sekali sampai selesai, baru `web` start. DB ada di volume `kepeser-data`,
jadi `docker compose down && up` tidak menghapus data.

## Peta kode

```
server/domain/transitions.ts   aturan alur hidup tiket — SATU tempat, semua route lewat sini
server/domain/kpi.ts           perhitungan KPI (fungsi murni)
server/domain/domain.test.ts   test untuk kedua file di atas
server/db/schema.ts            users · tickets · ticket_events
server/db/client.ts            WAL + busy_timeout + foreign_keys
server/utils/                  auth (requireRole) · rate-limit · validation (zod) · tickets
server/api/                    endpoint
app/pages/                     halaman
app/assets/css/tailwind.css    token DESIGN.md → CSS var yang dibaca shadcn-vue
```

## Alur & status

```
issue publik  →  pending  ──approve──→  approved  ──start──→  in_progress  ──done──→  done
                    │                      ↑                                            │
                    └──reject──→ rejected  └────────────── reopen ─────────────────────┘
```

**Arsip = soft delete.** "Hapus" di tabel tiket mengisi `archived_at`, bukan DELETE. Tiket
hilang dari `/tickets`, `/me`, dan `/inbox`, tapi barisnya tetap ada: KPI periode lalu tidak
berubah surut, jejak audit utuh, dan link pelacakan pelapor tetap 200 dengan keterangan
"diarsipkan". Tiket terarsip **beku** terhadap semua aksi sampai dipulihkan.

**Tugas internal** (maintenance, infra, pengembangan sistem baru) bisa dibuat **semua staff
IT**, langsung berstatus `approved` — tidak lewat antrean approval, karena yang membuat tim
IT sendiri. Penanggung jawabnya = pembuatnya; hanya supervisor yang boleh menunjuk orang
lain (`resolveAssignee()` di `server/domain/transitions.ts`). Pelapor diambil dari sesi,
tidak dari body request.

Tidak ada status `assigned` terpisah: "sudah di-assign, belum dikerjakan" =
`approved` + `assignee_id` terisi.

## Aturan yang dijaga di server, bukan di UI

Menyembunyikan tombol bukan izin. Semua ini ditegakkan `requireRole` + `canTransition`,
dan diuji lewat `curl` langsung ke API:

- Hanya supervisor: approve, reject, assign (tiket yang sudah ada), reopen, kelola akun.
- Semua staff boleh membuat tugas internal, tapi staff yang mengirim `assigneeId` orang
  lain diabaikan — tidak ada jalur melempar kerja ke rekan lewat API.
- Staff hanya bisa start/done tiket miliknya sendiri (supervisor boleh menutup atas nama tim).
- Staff yang memanggil `/api/kpi?userId=<orang lain>` tetap hanya melihat dirinya sendiri.
- Tiket `rejected` beku. Tidak ada lompatan status (`pending` → `done` ditolak 409).
- Reject wajib beralasan — pelapor membacanya di halaman pelacakan.
- Komentar internal tidak muncul di timeline publik.
- Lampiran gambar: tipe ditentukan **magic byte** (`server/domain/image.ts`), bukan
  ekstensi atau `Content-Type` kiriman client. SVG ditolak — XML bisa memuat `<script>`.
  Nama berkas di disk = UUID, nama unggahan tidak pernah dipakai. Penyajiannya butuh sesi
  staff atau `publicToken` tiket itu; tidak ada URL publik telanjang.
- Papan publik `/api/board` hanya memancarkan `id, title, category, status, assigneeName,
  updatedAt`. Nama & divisi pelapor, deskripsi, prioritas, due date, dan `publicToken`
  **tidak pernah** ikut — proyeksinya ditulis kolom per kolom di `server/api/board.get.ts`.
- Supervisor tidak bisa menonaktifkan atau menurunkan akunnya sendiri.
- Pendaftaran mandiri `/api/auth/register`: `role` dan `status` **selalu** ditentukan server
  (`staff` / `pending`), tidak pernah dibaca dari body. Domain email dibatasi
  `ALLOWED_EMAIL_DOMAIN` dengan perbandingan **persis** setelah `@` terakhir — bukan
  `endsWith()`, yang akan meloloskan `penyerang@evilinilah.com`.
- Akun `pending` tidak bisa login, tidak muncul di dropdown assign, dan tidak ikut KPI.
- Login memverifikasi password **sebelum** memeriksa status: pesan "menunggu persetujuan"
  hanya terlihat oleh orang yang sudah tahu passwordnya.
- `DELETE /api/users/[id]` hanya menghapus baris `pending`. Akun aktif tidak bisa dihapus
  lewat jalur mana pun — hanya `disabled`, supaya KPI historisnya utuh.
- Edit tiket: hanya supervisor atau penanggung jawabnya. Arsip/pulihkan: supervisor saja.
- Semua pesan validasi bahasa Indonesia, dari satu peta di `server/utils/validation.ts`
  (`Deskripsi minimal 10 karakter.`, bukan `Too small: expected string to have >=10`).

## Akun staff

Tiga keadaan, bukan satu bit `active`: **`pending`** (mendaftar sendiri, belum diputuskan),
**`active`** (satu-satunya yang boleh login), **`disabled`** (mantan karyawan). Tanpa
pemisahan ini, antrean persetujuan tidak bisa dibedakan dari daftar akun nonaktif.

Dua jalur pembuatan akun: supervisor menambah langsung di `/admin/users` (langsung `active`),
atau staff mendaftar sendiri di `/daftar` (jadi `pending`, menunggu persetujuan). Badge angka
di menu "Akun" memberi tahu supervisor ada permintaan yang menunggu.

Menolak pendaftaran = barisnya dihapus, bukan ditandai `rejected` — supaya orang yang salah
ketik email bisa mendaftar ulang tanpa terblokir indeks unik email.

## Papan publik

Halaman depan menampilkan apa yang sedang dikerjakan tim IT, tanpa login. Yang masuk papan:
`approved`, `in_progress`, dan `done` dalam 7 hari terakhir.

Tidak pernah masuk: `pending` (belum disetujui, bisa berakhir ditolak), `rejected`, tiket
terarsip, dan tiket yang ditandai `public_hidden`. Supervisor menyembunyikan tiket bertajuk
sensitif lewat dropdown aksi di `/tickets` atau kartu "Papan publik" di halaman detail —
barisnya hilang sepenuhnya, bukan judulnya diganti, karena baris "judul disembunyikan"
justru mengumumkan bahwa ada sesuatu yang sensitif.

`PublicBoard.vue` sengaja bukan memakai ulang `TicketTable.vue`: komponen itu membawa
dropdown aksi, dialog edit/arsip, dan kolom pelapor. Satu `v-if` kelewat di sana = kebocoran.

## KPI

Dihitung per staff, per rentang tanggal, di `server/domain/kpi.ts`:

- **Median resolution time** — `assigned_at → done_at`. Median, bukan rata-rata: satu tiket
  berat tidak merusak angka seorang staff.
- **On-time rate** — dari tiket done yang punya due date. Tiket tanpa due date tidak menghukum.
- **Throughput** — jumlah done, dipecah per kategori.
- **Reopen rate** — proxy kualitas, penyeimbang throughput.
- **Overdue open** — belum selesai dan sudah lewat target. Bukan KPI historis; ini alarm hari ini.

## Stabilitas I/O

- SQLite WAL: banyak pembaca berdampingan dengan satu penulis. `busy_timeout` 5s,
  `foreign_keys` ON.
- Setiap perubahan tiket + jejak auditnya ditulis dalam satu transaksi lewat `applyChange()` —
  tidak ada status berubah tanpa jejak.
- Zod memvalidasi setiap body sebelum menyentuh DB.
- Form publik dibatasi token bucket per IP (in-memory).
- Index pada `status`, `assignee_id`, `created_at`, `done_at`, `public_token`.

## Catatan teknis

- **Kenapa `better-sqlite3`, bukan `bun:sqlite`** — dev server Nuxt memuat handler lewat ESM
  loader Node yang tidak mengenal skema `bun:`; sebaliknya binary prebuilt better-sqlite3
  crash (SIGILL) di bawah Bun. `better-sqlite3` + Node dipakai konsisten di dev dan produksi.
- **TypeScript dipin ke 5.x** — `@vue/compiler-sfc` butuh `ts.sys` untuk meresolusi tipe
  yang diimpor lintas file (dipakai semua komponen shadcn-vue). TypeScript 7 tidak lagi
  mengeksposnya, dan semua halaman gagal render 500. Jangan naikkan ke 7 tanpa mengecek ini.
- **DESIGN.md** adalah analisis sistem PostHog. Yang diambil kosakata visualnya — kanvas
  krem, satu CTA kuning, kartu datar berborder hairline, radius 6px, IBM Plex Sans, banner
  callout pastel. Maskot landak tidak diambil: itu identitas PostHog, bukan inilah.com.

## Sengaja belum ada

- Antrean tulis offline (PWA-nya precache app shell saja)
- Notifikasi email/WhatsApp — `ticket_events` sudah jadi hook-nya
- Lampiran file
- Reset password mandiri — supervisor reset lewat `/admin/users`
