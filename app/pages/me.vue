<script setup lang="ts">
import { RANGE_OPTIONS } from '~/lib/format'

useHead({ title: 'Performa saya — Kepeser' })

const { user } = useUserSession()
const range = ref<number>(30)
const now = Math.floor(Date.now() / 1000)
const kpiQuery = computed(() => ({ from: now - range.value * 86400, to: now }))

const { data: kpi } = await useFetch('/api/kpi', { query: kpiQuery })
const { data: mine } = await useFetch('/api/tickets', { query: { mine: '1' } })

const me = computed(() => kpi.value?.staff.find((s: any) => s.id === user.value?.id))
const active = computed(() =>
  (mine.value || []).filter((t: any) => t.status === 'approved' || t.status === 'in_progress'),
)
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <Eyebrow>{{ user?.name }}</Eyebrow>
      <h1 class="mt-1 text-2xl font-extrabold tracking-tight text-foreground">Performa saya</h1>
    </div>
    <div class="flex items-center gap-2">
      <SelectField v-model="range" size="sm" :options="RANGE_OPTIONS" class="w-36 sm:w-44" />
      <NewTicketDialog @created="refreshNuxtData()" />
    </div>
  </div>

  <div class="mt-6">
    <KpiCards v-if="me" :kpi="me.kpi" />
  </div>

  <h2 class="mt-10 text-lg font-bold text-foreground">
    Tugas aktif <span class="text-mute-foreground">({{ active.length }})</span>
  </h2>
  <TicketTable :rows="active" @changed="refreshNuxtData()" />

  <h2 class="mt-10 text-lg font-bold text-foreground">Semua tugas saya</h2>
  <TicketTable :rows="mine || []" @changed="refreshNuxtData()" />
</template>
