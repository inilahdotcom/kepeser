<script setup lang="ts">
import { CATEGORIES, PRIORITIES, STATUSES } from '~~/server/db/schema'
import { CATEGORY_LABEL, PRIORITY_LABEL, STATUS_LABEL, toOptions } from '~/lib/format'

useHead({ title: 'Tiket — Kepeser' })

const filters = reactive({ status: '', category: '', priority: '', assigneeId: '' })
const { data: staff } = await useFetch('/api/users')
const query = computed(() => Object.fromEntries(Object.entries(filters).filter(([, v]) => v)))
const { data: rows, status } = await useFetch('/api/tickets', { query })

const statusOptions = [{ value: '', label: 'Semua status' }, ...toOptions(STATUSES, STATUS_LABEL)]
const categoryOptions = [
  { value: '', label: 'Semua kategori' },
  ...toOptions(CATEGORIES, CATEGORY_LABEL),
]
const priorityOptions = [
  { value: '', label: 'Semua prioritas' },
  ...toOptions(PRIORITIES, PRIORITY_LABEL),
]
const staffOptions = computed(() => [
  { value: '', label: 'Semua staff' },
  ...(staff.value ?? []).map((u) => ({ value: String(u.id), label: u.name })),
])
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <Eyebrow>Seluruh tim</Eyebrow>
      <h1 class="mt-1 text-2xl font-extrabold tracking-tight text-foreground">Tiket</h1>
    </div>
    <NewTicketDialog @created="refreshNuxtData()" />
  </div>

  <!-- Mobile: 2 kolom penuh. sm+: sejajar, lebar tetap supaya label panjang tidak melompat. -->
  <div class="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
    <SelectField v-model="filters.status" size="sm" :options="statusOptions" class="sm:w-44" />
    <SelectField v-model="filters.category" size="sm" :options="categoryOptions" class="sm:w-44" />
    <SelectField v-model="filters.priority" size="sm" :options="priorityOptions" class="sm:w-40" />
    <SelectField v-model="filters.assigneeId" size="sm" :options="staffOptions" class="sm:w-44" />
  </div>

  <TicketTable
    :rows="rows || []"
    :loading="status === 'pending'"
    @changed="refreshNuxtData()"
  />
</template>
