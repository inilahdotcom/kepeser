<script setup lang="ts">
import { toast } from 'vue-sonner'
import { CATEGORIES, PRIORITIES } from '~~/server/db/schema'
import { CATEGORY_LABEL, PRIORITY_LABEL, toOptions } from '~/lib/format'

const props = defineProps<{ ticket: any }>()
const emit = defineEmits<{ saved: [] }>()
const open = defineModel<boolean>('open', { default: false })

const busy = ref(false)
const form = reactive({ title: '', description: '', category: 'bug', priority: 'normal' })

const categoryOptions = toOptions(CATEGORIES, CATEGORY_LABEL)
const priorityOptions = toOptions(PRIORITIES, PRIORITY_LABEL)

// Isi ulang tiap dialog dibuka — supaya edit yang dibatalkan tidak nyangkut.
watch(open, (o) => {
  if (o && props.ticket)
    Object.assign(form, {
      title: props.ticket.title,
      description: props.ticket.description,
      category: props.ticket.category,
      priority: props.ticket.priority,
    })
})

async function submit() {
  busy.value = true
  try {
    await $fetch(`/api/tickets/${props.ticket.id}`, { method: 'PATCH', body: form })
    toast.success('Tiket diperbarui.')
    open.value = false
    emit('saved')
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || 'Gagal menyimpan.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit tiket #{{ ticket?.id }}</DialogTitle>
        <DialogDescription>
          Status dan penanggung jawab diubah lewat tombolnya sendiri di halaman detail.
        </DialogDescription>
      </DialogHeader>

      <form class="grid gap-4" @submit.prevent="submit">
        <div>
          <Label for="ed-t">Judul</Label>
          <Input id="ed-t" v-model="form.title" required />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <Label for="ed-c">Kategori</Label>
            <SelectField id="ed-c" v-model="form.category" :options="categoryOptions" />
          </div>
          <div>
            <Label for="ed-p">Prioritas</Label>
            <SelectField id="ed-p" v-model="form.priority" :options="priorityOptions" />
          </div>
        </div>
        <div>
          <Label for="ed-d">Deskripsi</Label>
          <Textarea id="ed-d" v-model="form.description" required rows="6" />
        </div>
        <DialogFooter>
          <Button type="submit" :disabled="busy" class="font-bold">
            {{ busy ? 'Menyimpan…' : 'Simpan perubahan' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
