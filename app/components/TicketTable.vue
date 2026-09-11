<script setup lang="ts">
import { MoreHorizontal } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { CATEGORY_LABEL, fmtDate, PRIORITY_LABEL } from '~/lib/format'

defineProps<{ rows: any[]; loading?: boolean }>()
const emit = defineEmits<{ changed: [] }>()

const { user } = useUserSession()
const isSupervisor = computed(() => user.value?.role === 'supervisor')
const canEdit = (t: any) => isSupervisor.value || t.assigneeId === user.value?.id

const now = Math.floor(Date.now() / 1000)
const isOverdue = (t: any) => t.dueAt && !t.doneAt && t.status !== 'rejected' && t.dueAt < now

const editing = ref<any>(null)
const editOpen = ref(false)
const archiving = ref<any>(null)
const busy = ref(false)

function openEdit(t: any) {
  editing.value = t
  editOpen.value = true
}

async function toggleBoard(t: any) {
  const hidden = !t.publicHidden
  try {
    await $fetch(`/api/tickets/${t.id}/board`, { method: 'POST', body: { hidden } })
    toast.success(
      hidden ? `#${t.id} disembunyikan dari papan publik.` : `#${t.id} tampil di papan publik.`,
    )
    emit('changed')
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || 'Gagal mengubah visibilitas.')
  }
}

// Dialog shadcn, bukan confirm() bawaan browser — modal native memblokir halaman.
async function confirmArchive() {
  busy.value = true
  try {
    await $fetch(`/api/tickets/${archiving.value.id}/archive`, {
      method: 'POST',
      body: { archived: true },
    })
    toast.success(`Tiket #${archiving.value.id} diarsipkan.`)
    archiving.value = null
    emit('changed')
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || 'Gagal mengarsipkan.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mt-4 overflow-x-auto rounded-md border border-border bg-card">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-border text-left">
          <th class="px-4 py-3 text-xs font-bold uppercase tracking-wide text-body">#</th>
          <th class="px-4 py-3 text-xs font-bold uppercase tracking-wide text-body">Judul</th>
          <th class="px-4 py-3 text-xs font-bold uppercase tracking-wide text-body">Status</th>
          <th class="px-4 py-3 text-xs font-bold uppercase tracking-wide text-body">Kategori</th>
          <th class="px-4 py-3 text-xs font-bold uppercase tracking-wide text-body">Prioritas</th>
          <th class="px-4 py-3 text-xs font-bold uppercase tracking-wide text-body">
            Penanggung jawab
          </th>
          <th class="px-4 py-3 text-xs font-bold uppercase tracking-wide text-body">Target</th>
          <!-- Tetap terlihat saat tabel discroll horizontal di layar sempit. -->
          <th
            class="sticky right-0 w-12 bg-card px-2 py-3 text-xs font-bold uppercase tracking-wide text-body"
          >
            <span class="sr-only">Aksi</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td colspan="8" class="px-4 py-8 text-center text-mute-foreground">Memuat…</td>
        </tr>
        <tr v-else-if="!rows.length">
          <td colspan="8" class="px-4 py-8 text-center text-mute-foreground">
            Tidak ada tiket yang cocok.
          </td>
        </tr>
        <tr
          v-for="t in rows"
          :key="t.id"
          class="group border-b border-border-soft last:border-b-0 hover:bg-surface-soft"
        >
          <td class="px-4 py-3 font-mono text-xs text-mute-foreground">{{ t.id }}</td>
          <td class="px-4 py-3">
            <NuxtLink :to="`/tickets/${t.id}`" class="font-semibold text-foreground no-underline">
              {{ t.title }}
            </NuxtLink>
            <div class="text-xs text-mute-foreground">
              {{ t.reporterName }} · {{ t.reporterDivision }}
              <span v-if="t.reopenCount" class="text-tone-red">
                · dibuka ulang {{ t.reopenCount }}×</span
              >
            </div>
          </td>
          <td class="px-4 py-3"><StatusBadge :status="t.status" /></td>
          <td class="px-4 py-3 text-body">{{ CATEGORY_LABEL[t.category] }}</td>
          <td class="px-4 py-3 text-body">{{ PRIORITY_LABEL[t.priority] }}</td>
          <td class="px-4 py-3 text-body">{{ t.assigneeName || '—' }}</td>
          <td class="px-4 py-3" :class="isOverdue(t) ? 'font-semibold text-tone-red' : 'text-body'">
            {{ fmtDate(t.dueAt) }}
          </td>
          <td class="sticky right-0 bg-card px-2 py-3 group-hover:bg-surface-soft">
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="ghost" size="icon" class="size-8">
                  <MoreHorizontal class="size-4" />
                  <span class="sr-only">Aksi tiket #{{ t.id }}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-44">
                <DropdownMenuItem as-child>
                  <NuxtLink :to="`/tickets/${t.id}`" class="no-underline">Lihat detail</NuxtLink>
                </DropdownMenuItem>
                <!-- Yang tidak boleh dipakai tidak dirender; server tetap penentunya. -->
                <DropdownMenuItem v-if="canEdit(t)" @select="openEdit(t)">Edit</DropdownMenuItem>
                <!-- Judul sensitif biasanya ketahuan saat memindai daftar ini,
                     jadi menyembunyikannya harus bisa seketika dari sini. -->
                <DropdownMenuItem v-if="isSupervisor" @select="toggleBoard(t)">
                  {{ t.publicHidden ? 'Tampilkan di papan publik' : 'Sembunyikan dari papan' }}
                </DropdownMenuItem>
                <template v-if="isSupervisor">
                  <DropdownMenuSeparator />
                  <DropdownMenuItem class="text-tone-red" @select="archiving = t">
                    Arsipkan
                  </DropdownMenuItem>
                </template>
              </DropdownMenuContent>
            </DropdownMenu>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <EditTicketDialog
    v-if="editing"
    v-model:open="editOpen"
    :ticket="editing"
    @saved="emit('changed')"
  />

  <Dialog :open="!!archiving" @update:open="(o) => !o && (archiving = null)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Arsipkan tiket #{{ archiving?.id }}?</DialogTitle>
        <DialogDescription>
          "{{ archiving?.title }}" akan hilang dari daftar tiket. Datanya tidak dihapus —
          KPI periode lalu tetap, jejak auditnya utuh, dan link pelacakan pelapor tetap
          hidup. Bisa dipulihkan dari halaman detailnya.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="secondary" :disabled="busy" @click="archiving = null">Batal</Button>
        <Button variant="destructive" :disabled="busy" class="font-bold" @click="confirmArchive">
          {{ busy ? 'Mengarsipkan…' : 'Arsipkan' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
