<script setup lang="ts">
import { STATUS_LABEL, STATUS_TONE } from '~/lib/format'

defineProps<{ status: string }>()
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
    :class="STATUS_TONE[status]"
  >
    {{ STATUS_LABEL[status] }}
  </span>
</template>
