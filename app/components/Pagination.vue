<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'

const props = defineProps<{ total: number; perPage: number }>()
const page = defineModel<number>({ required: true })

const halaman = computed(() => Math.max(1, Math.ceil(props.total / props.perPage)))
const dari = computed(() => (props.total ? (page.value - 1) * props.perPage + 1 : 0))
const sampai = computed(() => Math.min(page.value * props.perPage, props.total))
</script>

<template>
  <!-- Disembunyikan kalau semuanya muat di satu halaman — kontrol yang tidak
       bisa diklik cuma menambah bising. -->
  <div v-if="total > perPage" class="mt-4 flex flex-wrap items-center justify-between gap-3">
    <p class="text-sm text-mute-foreground">
      Menampilkan <strong class="text-foreground">{{ dari }}–{{ sampai }}</strong> dari
      <strong class="text-foreground">{{ total }}</strong>
    </p>
    <div class="flex items-center gap-2">
      <Button variant="secondary" :disabled="page <= 1" class="h-9 gap-1" @click="page--">
        <ChevronLeft class="size-4" /> Sebelumnya
      </Button>
      <span class="text-sm text-body">{{ page }} / {{ halaman }}</span>
      <Button
        variant="secondary"
        :disabled="page >= halaman"
        class="h-9 gap-1"
        @click="page++"
      >
        Berikutnya <ChevronRight class="size-4" />
      </Button>
    </div>
  </div>
</template>
