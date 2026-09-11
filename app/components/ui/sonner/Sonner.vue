<script lang="ts" setup>
import {
  CircleCheck,
  Info,
  Loader2,
  OctagonX,
  TriangleAlert,
  X,
} from '@lucide/vue'
import { Toaster as Sonner } from 'vue-sonner'

// Ditulis ulang dari keluaran shadcn: `defineProps<ToasterProps>()` (tipe lintas
// file) tidak bisa diresolusi compiler-sfc di sini, dan ikonnya diimpor dari
// paket lucide yang tidak kita pakai. Attrs jatuh ke root Sonner sendirinya.
</script>

<template>
  <Sonner
    class="toaster group"
    :style="{
      '--normal-bg': 'var(--popover)',
      '--normal-text': 'var(--popover-foreground)',
      '--normal-border': 'var(--border)',
      '--border-radius': 'var(--radius)',
    }"
  >
    <template #success-icon><CircleCheck class="size-4" /></template>
    <template #info-icon><Info class="size-4" /></template>
    <template #warning-icon><TriangleAlert class="size-4" /></template>
    <template #error-icon><OctagonX class="size-4" /></template>
    <template #loading-icon><Loader2 class="size-4 animate-spin" /></template>
    <template #close-icon><X class="size-4" /></template>
  </Sonner>
</template>
