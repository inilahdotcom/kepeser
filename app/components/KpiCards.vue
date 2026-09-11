<script setup lang="ts">
import { fmtDuration, fmtPct } from '~/lib/format'
import { CATEGORY_LABEL } from '~/lib/format'

const props = defineProps<{ kpi: any }>()

const tiles = computed(() => [
  { label: 'Tugas selesai', value: String(props.kpi.doneCount), hint: 'dalam rentang ini' },
  {
    label: 'Waktu penyelesaian',
    value: fmtDuration(props.kpi.medianResolutionSec),
    hint: 'median, assign → selesai',
  },
  { label: 'Tepat waktu', value: fmtPct(props.kpi.onTimeRate), hint: 'dari yang punya target' },
  { label: 'Dibuka ulang', value: fmtPct(props.kpi.reopenRate), hint: 'makin kecil makin baik' },
])
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <div v-for="t in tiles" :key="t.label" class="rounded-md border border-border bg-card p-5">
      <p class="text-xs font-bold uppercase tracking-wide text-body">{{ t.label }}</p>
      <p class="mt-2 text-2xl font-extrabold tracking-tight text-foreground">{{ t.value }}</p>
      <p class="mt-1 text-xs text-mute-foreground">{{ t.hint }}</p>
    </div>
  </div>

  <div
    v-if="kpi.overdueOpen"
    class="mt-4 rounded-md border border-border bg-tone-red-soft p-5 text-foreground"
  >
    ⚠️ <strong>{{ kpi.overdueOpen }} tugas</strong> belum selesai dan sudah lewat target.
  </div>

  <div v-if="Object.keys(kpi.throughputByCategory).length" class="mt-4">
    <Eyebrow>Selesai per kategori</Eyebrow>
    <div class="mt-2 flex flex-wrap gap-2">
      <span
        v-for="(n, c) in kpi.throughputByCategory"
        :key="c"
        class="rounded-full bg-surface-soft px-3 py-1 text-sm text-foreground"
      >
        {{ CATEGORY_LABEL[c] || c }} · <strong>{{ n }}</strong>
      </span>
    </div>
  </div>
</template>
