<script setup lang="ts">
import { Check, Copy } from '@lucide/vue'
import { toast } from 'vue-sonner'

const props = withDefaults(
  defineProps<{ text: string; label?: string; variant?: 'default' | 'secondary' }>(),
  { label: 'Salin kode pelacakan', variant: 'secondary' },
)

const copied = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(timer))

/**
 * Tombol selalu dirender (termasuk di SSR) supaya tidak ada pergeseran layout.
 * Clipboard API butuh secure context — localhost & HTTPS aman, HTTP polos tidak.
 * Kalau gagal, kodenya ditampilkan supaya bisa disalin manual; bukan diam saja.
 */
async function copy() {
  try {
    await navigator.clipboard.writeText(props.text)
    copied.value = true
    clearTimeout(timer)
    timer = setTimeout(() => (copied.value = false), 2000)
  } catch {
    toast.error(`Gagal menyalin otomatis. Kodenya: ${props.text}`, { duration: 15000 })
  }
}
</script>

<template>
  <Button type="button" :variant="variant" class="h-10 gap-1.5" @click="copy">
    <component :is="copied ? Check : Copy" class="size-4" />
    {{ copied ? 'Tersalin!' : label }}
  </Button>
</template>
