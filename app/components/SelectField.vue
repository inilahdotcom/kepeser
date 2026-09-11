<script setup lang="ts">
import { selectKey, selectValueFromKey } from '~/lib/format'
import { cn } from '~/lib/utils'

export type SelectOption = { value: string | number; label: string }

const props = withDefaults(
  defineProps<{
    options: SelectOption[]
    placeholder?: string
    size?: 'sm' | 'default'
    id?: string
    class?: string
  }>(),
  { size: 'default' },
)

const model = defineModel<string | number>()

const inner = computed({
  get: () => (model.value === undefined || model.value === null ? undefined : selectKey(model.value)),
  set: (k?: string) => {
    model.value = selectValueFromKey(props.options, k)
  },
})

// SelectValue milik reka-ui membaca teks dari SelectItem yang sudah ter-mount,
// dan item-item itu hidup di portal yang baru ada saat dropdown dibuka. Hasilnya
// trigger kosong di SSR sampai hidrasi. Label sudah ada di `options`, jadi
// render sendiri saja.
const selectedLabel = computed(
  () => props.options.find((o) => selectKey(o.value) === inner.value)?.label,
)
</script>

<template>
  <Select v-model="inner">
    <SelectTrigger :id="id" :size="size" :class="cn('w-full bg-card', props.class)">
      <SelectValue>
        <span v-if="selectedLabel">{{ selectedLabel }}</span>
        <span v-else class="text-muted-foreground">{{ placeholder ?? 'Pilih…' }}</span>
      </SelectValue>
    </SelectTrigger>
    <SelectContent>
      <SelectItem v-for="o in options" :key="selectKey(o.value)" :value="selectKey(o.value)">
        {{ o.label }}
      </SelectItem>
    </SelectContent>
  </Select>
</template>
