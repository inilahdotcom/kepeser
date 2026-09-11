<script setup lang="ts">
import { fmtDuration, fmtPct, JOB_LABEL, RANGE_OPTIONS } from '~/lib/format'

useHead({ title: 'KPI tim — Kepeser' })

const range = ref<number>(30)
const now = Math.floor(Date.now() / 1000)
const { data } = await useFetch('/api/kpi', {
  query: computed(() => ({ from: now - range.value * 86400, to: now })),
})
const selected = ref<number | null>(null)
const detail = computed(() => data.value?.staff.find((s: any) => s.id === selected.value))
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <Eyebrow>Supervisor</Eyebrow>
      <h1 class="mt-1 text-2xl font-extrabold tracking-tight text-foreground">KPI tim IT</h1>
      <p class="mt-1 text-body">
        Waktu penyelesaian pakai <strong>median</strong>, bukan rata-rata — satu tiket berat
        tidak merusak angka seorang staff.
      </p>
    </div>
    <SelectField v-model="range" size="sm" :options="RANGE_OPTIONS" class="w-full sm:w-44" />
  </div>

  <div class="mt-6 overflow-x-auto rounded-md border border-border bg-card">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-border text-left">
          <th class="px-4 py-3 text-xs font-bold uppercase tracking-wide text-body">Staff</th>
          <th class="px-4 py-3 text-xs font-bold uppercase tracking-wide text-body">Selesai</th>
          <th class="px-4 py-3 text-xs font-bold uppercase tracking-wide text-body">Median waktu</th>
          <th class="px-4 py-3 text-xs font-bold uppercase tracking-wide text-body">Tepat waktu</th>
          <th class="px-4 py-3 text-xs font-bold uppercase tracking-wide text-body">Dibuka ulang</th>
          <th class="px-4 py-3 text-xs font-bold uppercase tracking-wide text-body">Lewat target</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="s in data?.staff"
          :key="s.id"
          class="cursor-pointer border-b border-border-soft last:border-b-0 hover:bg-surface-soft"
          @click="selected = selected === s.id ? null : s.id"
        >
          <td class="px-4 py-3">
            <span class="font-semibold text-foreground">{{ s.name }}</span>
            <div class="text-xs text-mute-foreground">{{ JOB_LABEL[s.jobTitle] || s.jobTitle }}</div>
          </td>
          <td class="px-4 py-3 text-body">{{ s.kpi.doneCount }}</td>
          <td class="px-4 py-3 text-body">{{ fmtDuration(s.kpi.medianResolutionSec) }}</td>
          <td class="px-4 py-3 text-body">{{ fmtPct(s.kpi.onTimeRate) }}</td>
          <td class="px-4 py-3 text-body">{{ fmtPct(s.kpi.reopenRate) }}</td>
          <td
            class="px-4 py-3"
            :class="s.kpi.overdueOpen ? 'font-semibold text-tone-red' : 'text-body'"
          >
            {{ s.kpi.overdueOpen }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <div v-if="detail" class="mt-8">
    <h2 class="text-lg font-bold text-foreground">{{ detail.name }}</h2>
    <div class="mt-3"><KpiCards :kpi="detail.kpi" /></div>
  </div>
  <p v-else class="mt-3 text-sm text-mute-foreground">Klik baris untuk rincian per staff.</p>
</template>
