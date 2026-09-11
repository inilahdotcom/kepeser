<script setup lang="ts">
import { toast } from 'vue-sonner'
import { CATEGORY_LABEL, fmtDate } from '~/lib/format'

useHead({ title: 'Approval — Kepeser' })

const { data: rows, refresh } = await useFetch('/api/tickets', { query: { status: 'pending' } })
const busy = ref<number | null>(null)
const reasons = reactive<Record<number, string>>({})

async function decide(id: number, approve: boolean) {
  if (!approve && !reasons[id]?.trim()) return toast.error('Alasan penolakan wajib diisi.')
  busy.value = id
  try {
    await $fetch(`/api/tickets/${id}/approve`, {
      method: 'POST',
      body: { approve, reason: reasons[id] },
    })
    await refresh()
    toast.success(approve ? `Issue #${id} disetujui.` : `Issue #${id} ditolak.`)
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || 'Aksi gagal.')
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <Eyebrow>Antrean supervisor</Eyebrow>
  <h1 class="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
    Menunggu approval
    <span v-if="rows?.length" class="text-mute-foreground">({{ rows.length }})</span>
  </h1>
  <p class="mt-1 text-body">
    Setujui untuk masuk antrean kerja tim, atau tolak dengan alasan yang bisa dibaca pelapor.
  </p>

  <div v-if="!rows?.length" class="mt-8 rounded-md border border-border bg-tone-green-soft p-6">
    <p class="text-foreground">✅ Tidak ada yang menunggu. Antrean bersih.</p>
  </div>

  <div v-else class="mt-6 space-y-4">
    <article v-for="t in rows" :key="t.id" class="rounded-md border border-border bg-card p-6">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <NuxtLink
            :to="`/tickets/${t.id}`"
            class="text-lg font-semibold text-foreground no-underline"
          >
            <span class="text-mute-foreground">#{{ t.id }}</span> {{ t.title }}
          </NuxtLink>
          <p class="mt-1 text-sm text-mute-foreground">
            {{ t.reporterName }} · {{ t.reporterDivision }} · {{ CATEGORY_LABEL[t.category] }} ·
            {{ fmtDate(t.createdAt) }}
          </p>
        </div>
        <StatusBadge :status="t.status" />
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-2">
        <Button :disabled="busy === t.id" class="font-bold" @click="decide(t.id, true)">
          Setujui
        </Button>
        <Input
          v-model="reasons[t.id]"
          placeholder="Alasan penolakan"
          class="max-w-[300px]"
        />
        <Button variant="secondary" :disabled="busy === t.id" @click="decide(t.id, false)">
          Tolak
        </Button>
        <NuxtLink :to="`/tickets/${t.id}`" class="ml-auto text-sm">Lihat detail →</NuxtLink>
      </div>
    </article>
  </div>
</template>
