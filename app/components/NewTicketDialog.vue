<script setup lang="ts">
import { toast } from 'vue-sonner'
import { CATEGORIES, PRIORITIES } from '~~/server/db/schema'
import { CATEGORY_LABEL, dateTimeInputToEpoch, PRIORITY_LABEL, toOptions } from '~/lib/format'

const emit = defineEmits<{ created: [] }>()
const { user } = useUserSession()
const isSupervisor = computed(() => user.value?.role === 'supervisor')

const open = ref(false)
const busy = ref(false)

// Dipakai hanya oleh supervisor untuk memilih penanggung jawab. useFetch men-dedupe
// dengan halaman yang sudah memanggil endpoint yang sama.
const { data: staff } = await useFetch('/api/users')

/** Tugas internal: maintenance, infra, pengembangan sistem baru — bukan laporan divisi lain. */
const blank = {
  title: '',
  description: '',
  category: 'maintenance' as (typeof CATEGORIES)[number],
  priority: 'normal' as (typeof PRIORITIES)[number],
  assigneeId: '',
  dueDate: '',
}
const form = reactive({ ...blank })

const categoryOptions = toOptions(CATEGORIES, CATEGORY_LABEL)
const priorityOptions = toOptions(PRIORITIES, PRIORITY_LABEL)
const assigneeOptions = computed(() => [
  { value: '', label: 'Saya sendiri' },
  ...(staff.value ?? []).map((u) => ({ value: String(u.id), label: u.name })),
])

async function submit() {
  busy.value = true
  try {
    const { assigneeId, dueDate, ...rest } = form
    await $fetch('/api/tickets', {
      method: 'POST',
      body: {
        ...rest,
        // Server mengabaikan ini kalau pengirimnya bukan supervisor (resolveAssignee).
        assigneeId: assigneeId ? Number(assigneeId) : null,
        dueAt: dateTimeInputToEpoch(dueDate),
      },
    })
    toast.success('Tugas dibuat.')
    open.value = false
    Object.assign(form, blank)
    emit('created')
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || 'Gagal membuat tugas.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button class="h-10 font-bold">Buat tugas</Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Buat tugas</DialogTitle>
        <DialogDescription>
          Untuk kerja yang tidak berasal dari laporan divisi lain — maintenance, infra,
          pengembangan sistem baru. Tidak lewat antrean approval.
          <template v-if="!isSupervisor">
            Tugas ini otomatis jadi tanggung jawab Anda.
          </template>
        </DialogDescription>
      </DialogHeader>

      <form class="grid gap-4" @submit.prevent="submit">
        <div>
          <Label for="nt-t">Judul</Label>
          <Input id="nt-t" v-model="form.title" required />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <Label for="nt-c">Kategori</Label>
            <SelectField id="nt-c" v-model="form.category" :options="categoryOptions" />
          </div>
          <div>
            <Label for="nt-p">Prioritas</Label>
            <SelectField id="nt-p" v-model="form.priority" :options="priorityOptions" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div v-if="isSupervisor">
            <Label for="nt-a">Penanggung jawab</Label>
            <SelectField id="nt-a" v-model="form.assigneeId" :options="assigneeOptions" />
          </div>
          <div>
            <Label for="nt-due">Target selesai</Label>
            <!-- native datetime-local; tanpa date picker lib -->
            <Input id="nt-due" v-model="form.dueDate" type="datetime-local" />
          </div>
        </div>

        <div>
          <Label for="nt-d">Deskripsi</Label>
          <Textarea id="nt-d" v-model="form.description" required rows="5" />
        </div>

        <DialogFooter>
          <Button type="submit" :disabled="busy" class="font-bold">
            {{ busy ? 'Menyimpan…' : 'Buat tugas' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
