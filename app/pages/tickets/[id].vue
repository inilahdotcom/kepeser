<script setup lang="ts">
import { toast } from 'vue-sonner'
import { PRIORITIES } from '~~/server/db/schema'
import {
  CATEGORY_LABEL,
  dateTimeInputToEpoch,
  epochToDateTimeInput,
  EVENT_LABEL,
  fmtDate,
  PRIORITY_LABEL,
  toOptions,
} from '~/lib/format'

const route = useRoute()
const { user } = useUserSession()
const isSupervisor = computed(() => user.value?.role === 'supervisor')

const { data, refresh } = await useFetch(`/api/tickets/${route.params.id}`)
const { data: staff } = await useFetch('/api/users')
useHead({ title: () => (data.value ? `#${data.value.ticket.id} ${data.value.ticket.title}` : 'Tiket') })

const t = computed(() => data.value?.ticket)
const busy = ref(false)
const comment = ref('')
const rejectReason = ref('')
const assign = reactive({ assigneeId: '', dueDate: '', priority: '' })

const priorityOptions = toOptions(PRIORITIES, PRIORITY_LABEL)
const assigneeOptions = computed(() =>
  (staff.value ?? []).map((u) => ({ value: String(u.id), label: u.name })),
)

watchEffect(() => {
  if (t.value) {
    assign.assigneeId = t.value.assigneeId ? String(t.value.assigneeId) : ''
    assign.priority = t.value.priority
    // Lewat helper lokal — toISOString() memundurkan tanggal sehari di UTC+7.
    assign.dueDate = epochToDateTimeInput(t.value.dueAt)
  }
})

/** Aksi yang boleh ditampilkan. Server tetap memutuskan lewat canTransition. */
const canStart = computed(
  () =>
    t.value?.status === 'approved' &&
    t.value.assigneeId &&
    (isSupervisor.value || t.value.assigneeId === user.value?.id),
)
const canDone = computed(
  () =>
    t.value?.status === 'in_progress' &&
    (isSupervisor.value || t.value.assigneeId === user.value?.id),
)

async function call(url: string, body: any, okMsg: string) {
  busy.value = true
  try {
    await $fetch(url, { method: 'POST', body })
    await refresh()
    toast.success(okMsg)
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || 'Aksi gagal.')
  } finally {
    busy.value = false
  }
}

const base = computed(() => `/api/tickets/${route.params.id}`)

const doApprove = () => call(`${base.value}/approve`, { approve: true }, 'Tiket disetujui.')
const doReject = () =>
  rejectReason.value.trim()
    ? call(`${base.value}/approve`, { approve: false, reason: rejectReason.value }, 'Tiket ditolak.')
    : toast.error('Alasan penolakan wajib diisi.')
const doStatus = (action: string) => call(`${base.value}/status`, { action }, 'Status diperbarui.')
const doAssign = () =>
  assign.assigneeId
    ? call(
        `${base.value}/assign`,
        {
          assigneeId: Number(assign.assigneeId),
          dueAt: dateTimeInputToEpoch(assign.dueDate),
          priority: assign.priority || undefined,
        },
        'Tiket di-assign.',
      )
    : toast.error('Pilih staff terlebih dahulu.')
async function doComment() {
  if (!comment.value.trim()) return
  await call(`${base.value}/comment`, { note: comment.value }, 'Komentar ditambahkan.')
  comment.value = ''
}
</script>

<template>
  <div v-if="t" class="grid gap-8 lg:grid-cols-[1fr_320px]">
    <div>
      <NuxtLink to="/tickets" class="text-sm">← Semua tiket</NuxtLink>
      <div class="mt-2 flex flex-wrap items-center gap-3">
        <h1 class="text-2xl font-extrabold tracking-tight text-foreground">
          <span class="text-mute-foreground">#{{ t.id }}</span> {{ t.title }}
        </h1>
        <StatusBadge :status="t.status" />
      </div>
      <p class="mt-1 text-sm text-mute-foreground">
        Dilaporkan {{ t.reporterName }} · {{ t.reporterDivision }} · {{ fmtDate(t.createdAt) }}
      </p>

      <div
        v-if="t.archivedAt"
        class="mt-5 flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface-soft p-5"
      >
        <p class="text-body">
          📦 <strong class="text-foreground">Diarsipkan</strong> {{ fmtDate(t.archivedAt) }}.
          Tiket ini beku — tidak bisa diubah sampai dipulihkan.
        </p>
        <Button
          v-if="isSupervisor"
          variant="secondary"
          :disabled="busy"
          class="ml-auto"
          @click="call(`${base}/archive`, { archived: false }, 'Tiket dipulihkan.')"
        >
          Pulihkan
        </Button>
      </div>

      <div class="mt-5 rounded-md border border-border bg-card p-6">
        <p class="whitespace-pre-wrap text-body">{{ t.description }}</p>

        <figure v-if="t.imagePath" class="mt-5">
          <figcaption class="text-xs font-bold uppercase tracking-wide text-body">
            Lampiran dari pelapor
          </figcaption>
          <a :href="`/api/tickets/${t.id}/image`" target="_blank" rel="noopener">
            <img
              :src="`/api/tickets/${t.id}/image`"
              alt="Lampiran dari pelapor"
              class="mt-2 max-h-96 rounded-md border border-border"
            />
          </a>
        </figure>
      </div>

      <!-- Antrean approval: hanya muncul saat memang perlu diputuskan -->
      <div
        v-if="t.status === 'pending' && isSupervisor"
        class="mt-4 rounded-md border border-border bg-tone-blue-soft p-5"
      >
        <p class="font-semibold text-foreground">Tiket ini menunggu keputusan Anda.</p>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <Button :disabled="busy" class="font-bold" @click="doApprove">Setujui</Button>
          <Input v-model="rejectReason" placeholder="Alasan penolakan" class="max-w-[280px]" />
          <Button variant="secondary" :disabled="busy" @click="doReject">Tolak</Button>
        </div>
      </div>

      <div
        v-if="t.status === 'rejected' && t.rejectReason"
        class="mt-4 rounded-md border border-border bg-tone-red-soft p-5"
      >
        <p class="text-foreground">⚠️ <strong>Ditolak:</strong> {{ t.rejectReason }}</p>
      </div>

      <div class="mt-6 flex flex-wrap items-center gap-2">
        <CopyButton :text="t.publicToken" />
        <Button v-if="canStart" :disabled="busy" class="font-bold" @click="doStatus('start')">
          Mulai kerjakan
        </Button>
        <Button v-if="canDone" :disabled="busy" class="font-bold" @click="doStatus('done')">
          Tandai selesai
        </Button>
        <Button
          v-if="t.status === 'done' && isSupervisor"
          variant="secondary"
          :disabled="busy"
          @click="doStatus('reopen')"
        >
          Buka kembali
        </Button>
      </div>

      <h2 class="mt-8 text-lg font-bold text-foreground">Diskusi & riwayat</h2>
      <form class="mt-3 flex gap-2" @submit.prevent="doComment">
        <Input v-model="comment" placeholder="Tulis update atau catatan…" />
        <Button type="submit" variant="secondary" :disabled="busy" class="shrink-0">Kirim</Button>
      </form>

      <ol class="mt-4 rounded-md border border-border bg-card">
        <li
          v-for="e in data!.events"
          :key="e.id"
          class="border-b border-border-soft px-5 py-3 text-sm last:border-b-0"
        >
          <span class="font-semibold text-foreground">{{ e.actorName || 'Sistem' }}</span>
          <span class="text-body"> {{ EVENT_LABEL[e.type] || e.type }}</span>
          <span v-if="e.note" class="text-body"> — {{ e.note }}</span>
          <span class="ml-1 text-mute-foreground">· {{ fmtDate(e.createdAt) }}</span>
        </li>
      </ol>
    </div>

    <aside class="space-y-4">
      <dl class="rounded-md border border-border bg-card p-6 text-sm">
        <div class="flex justify-between gap-4 border-b border-border-soft pb-2">
          <dt class="text-mute-foreground">Penanggung jawab</dt>
          <dd class="font-medium text-foreground">{{ t.assigneeName || 'Belum di-assign' }}</dd>
        </div>
        <div class="flex justify-between gap-4 border-b border-border-soft py-2">
          <dt class="text-mute-foreground">Kategori</dt>
          <dd class="font-medium text-foreground">{{ CATEGORY_LABEL[t.category] }}</dd>
        </div>
        <div class="flex justify-between gap-4 border-b border-border-soft py-2">
          <dt class="text-mute-foreground">Prioritas</dt>
          <dd class="font-medium text-foreground">{{ PRIORITY_LABEL[t.priority] }}</dd>
        </div>
        <div class="flex justify-between gap-4 border-b border-border-soft py-2">
          <dt class="text-mute-foreground">Target selesai</dt>
          <dd class="font-medium text-foreground">{{ fmtDate(t.dueAt) }}</dd>
        </div>
        <div class="flex justify-between gap-4 border-b border-border-soft py-2">
          <dt class="text-mute-foreground">Dibuka ulang</dt>
          <dd class="font-medium text-foreground">{{ t.reopenCount }}×</dd>
        </div>
        <div class="flex justify-between gap-4 pt-2">
          <dt class="text-mute-foreground">Selesai</dt>
          <dd class="font-medium text-foreground">{{ fmtDate(t.doneAt) }}</dd>
        </div>
      </dl>

      <div v-if="isSupervisor" class="rounded-md border border-border bg-card p-6">
        <Eyebrow>Papan publik</Eyebrow>
        <p class="mt-2 text-sm text-body">
          {{
            t.publicHidden
              ? 'Tiket ini tidak muncul di halaman depan.'
              : 'Judul tiket ini terlihat oleh siapa pun di halaman depan.'
          }}
        </p>
        <Button
          variant="secondary"
          :disabled="busy"
          class="mt-3 w-full"
          @click="
            call(
              `${base}/board`,
              { hidden: !t.publicHidden },
              t.publicHidden ? 'Tampil di papan publik.' : 'Disembunyikan dari papan publik.',
            )
          "
        >
          {{ t.publicHidden ? 'Tampilkan di papan publik' : 'Sembunyikan dari papan' }}
        </Button>
      </div>

      <div
        v-if="isSupervisor && ['approved', 'in_progress'].includes(t.status)"
        class="rounded-md border border-border bg-card p-6"
      >
        <Eyebrow>Assign</Eyebrow>
        <form class="mt-3 grid gap-3" @submit.prevent="doAssign">
          <div>
            <Label for="as-staff">Penanggung jawab</Label>
            <SelectField
              id="as-staff"
              v-model="assign.assigneeId"
              :options="assigneeOptions"
              placeholder="Pilih staff…"
            />
          </div>
          <div>
            <Label for="as-prio">Prioritas</Label>
            <SelectField id="as-prio" v-model="assign.priority" :options="priorityOptions" />
          </div>
          <div>
            <Label for="due" class="text-xs">Target selesai</Label>
            <!-- native datetime-local; tanpa date picker lib -->
            <Input id="due" v-model="assign.dueDate" type="datetime-local" />
          </div>
          <Button type="submit" :disabled="busy" class="font-bold">Simpan assignment</Button>
        </form>
      </div>
    </aside>
  </div>
</template>
