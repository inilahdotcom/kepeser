import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const ROLES = ['supervisor', 'staff'] as const
export type Role = (typeof ROLES)[number]

/**
 * Tiga keadaan yang berbeda, bukan satu bit:
 *   pending   baru mendaftar sendiri, belum diputuskan supervisor
 *   active    disetujui / karyawan aktif — satu-satunya yang boleh login
 *   disabled  mantan karyawan, dimatikan
 */
export const USER_STATUSES = ['pending', 'active', 'disabled'] as const
export type UserStatus = (typeof USER_STATUSES)[number]

/** Jabatan — untuk tampilan & filter. Izin ditentukan `role`, bukan ini. */
export const JOB_TITLES = [
  'supervisor',
  'frontend',
  'backend',
  'devops',
  'support',
] as const
export type JobTitle = (typeof JOB_TITLES)[number]

export const STATUSES = ['pending', 'approved', 'in_progress', 'done', 'rejected'] as const
export type Status = (typeof STATUSES)[number]

export const CATEGORIES = [
  'bug',
  'request_fitur',
  'maintenance',
  'infra_jaringan',
  'akses_akun',
  'perangkat',
  'lainnya',
] as const
export type Category = (typeof CATEGORIES)[number]

export const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const
export type Priority = (typeof PRIORITIES)[number]

export const SOURCES = ['issue', 'internal'] as const
export type Source = (typeof SOURCES)[number]

export const EVENT_TYPES = [
  'created',
  'comment',
  'approve',
  'reject',
  'assign',
  'status',
  'reopen',
  'edit',
  'archive',
  'restore',
  'board',
] as const
export type EventType = (typeof EVENT_TYPES)[number]

export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    role: text('role').$type<Role>().notNull().default('staff'),
    jobTitle: text('job_title').$type<JobTitle>().notNull().default('support'),
    status: text('status').$type<UserStatus>().notNull().default('pending'),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex('users_email').on(t.email)],
)

export const tickets = sqliteTable(
  'tickets',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** Link pelacakan pelapor yang tidak bisa ditebak — pelapor tidak punya akun. */
    publicToken: text('public_token').notNull(),

    source: text('source').$type<Source>().notNull().default('issue'),
    reporterName: text('reporter_name').notNull(),
    reporterDivision: text('reporter_division').notNull(),

    title: text('title').notNull(),
    description: text('description').notNull(),
    category: text('category').$type<Category>().notNull(),
    priority: text('priority').$type<Priority>().notNull().default('normal'),

    status: text('status').$type<Status>().notNull().default('pending'),
    assigneeId: integer('assignee_id').references(() => users.id),
    createdBy: integer('created_by').references(() => users.id),
    rejectReason: text('reject_reason'),
    reopenCount: integer('reopen_count').notNull().default(0),

    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
    approvedAt: integer('approved_at'),
    assignedAt: integer('assigned_at'),
    startedAt: integer('started_at'),
    doneAt: integer('done_at'),
    dueAt: integer('due_at'),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`(unixepoch())`),
    /** Soft delete. Baris tetap ada supaya KPI historis dan link pelacakan utuh. */
    archivedAt: integer('archived_at'),
    /** Disembunyikan dari papan publik di halaman depan. Keputusan supervisor. */
    publicHidden: integer('public_hidden').notNull().default(0),
    /** Nama berkas acak di UPLOAD_DIR — TANPA komponen direktori, tanpa jejak nama unggahan. */
    imagePath: text('image_path'),
    /** Hasil sniff magic byte, bukan Content-Type kiriman client. */
    imageMime: text('image_mime'),
  },
  (t) => [
    uniqueIndex('tickets_public_token').on(t.publicToken),
    index('tickets_archived_at').on(t.archivedAt),
    index('tickets_board').on(t.publicHidden, t.status),
    index('tickets_status').on(t.status),
    index('tickets_assignee').on(t.assigneeId),
    index('tickets_created_at').on(t.createdAt),
    index('tickets_done_at').on(t.doneAt),
  ],
)

/** Thread komentar sekaligus audit trail — satu tabel untuk dua kebutuhan. */
export const ticketEvents = sqliteTable(
  'ticket_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    ticketId: integer('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    /** null = pelapor publik / sistem */
    actorId: integer('actor_id').references(() => users.id),
    type: text('type').$type<EventType>().notNull(),
    note: text('note'),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index('ticket_events_ticket').on(t.ticketId, t.createdAt)],
)

/**
 * Token reset password. Yang disimpan hash-nya (lihat server/domain/reset-token.ts);
 * tokennya sendiri hanya pernah ada di email penerima.
 */
export const passwordResets = sqliteTable(
  'password_resets',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: integer('expires_at').notNull(),
    /** Sekali pakai. Terisi = hangus. */
    usedAt: integer('used_at'),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex('password_resets_token').on(t.tokenHash),
    index('password_resets_user').on(t.userId),
  ],
)

export type User = typeof users.$inferSelect
export type Ticket = typeof tickets.$inferSelect
export type TicketEvent = typeof ticketEvents.$inferSelect
export type PasswordReset = typeof passwordResets.$inferSelect
