<script setup lang="ts">
import { toast } from 'vue-sonner'
import { CATEGORIES } from '~~/server/db/schema'
import { CATEGORY_LABEL, toOptions } from '~/lib/format'
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, prepareImage } from '~/lib/image'

definePageMeta({ layout: 'public' })
useHead({ title: 'Lapor issue — Kepeser · IT inilah.com' })

const form = reactive({
  reporterName: '',
  reporterDivision: '',
  title: '',
  description: '',
  category: 'bug' as (typeof CATEGORIES)[number],
})
const categoryOptions = toOptions(CATEGORIES, CATEGORY_LABEL)
const sending = ref(false)

const imageFile = ref<File | null>(null)
const imagePreview = ref('')

function pickImage(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  if (f.size > MAX_IMAGE_BYTES * 4) {
    toast.error('Gambar terlalu besar. Maksimal sekitar 5 MB setelah dikecilkan.')
    return
  }
  clearImage()
  imageFile.value = f
  imagePreview.value = URL.createObjectURL(f)
}

function clearImage() {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value)
  imagePreview.value = ''
  imageFile.value = null
}
onBeforeUnmount(clearImage)
const created = ref<{ id: number; publicToken: string } | null>(null)
const trackToken = ref('')

async function submit() {
  sending.value = true
  try {
    const fd = new FormData()
    for (const [k, v] of Object.entries(form)) fd.append(k, v)
    if (imageFile.value) fd.append('image', await prepareImage(imageFile.value), 'lampiran')

    created.value = await $fetch<{ id: number; publicToken: string }>('/api/issues', {
      method: 'POST',
      body: fd,
    })
    clearImage()
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || 'Gagal mengirim issue.')
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="grid gap-12 lg:grid-cols-[1fr_360px]">
    <div>
      <template v-if="created">
        <div class="rounded-md border border-border bg-tone-green-soft p-6">
          <p class="text-lg font-bold text-foreground">✅ Issue #{{ created.id }} terkirim</p>
          <p class="mt-2 text-body">
            Alvin IT akan meninjau dan meneruskannya ke antek-anteknya. Simpan link di
            bawah untuk memantau statusnya — link ini tidak butuh login.
          </p>
          <div class="mt-4 flex flex-wrap items-center gap-2">
            <NuxtLink
              :to="`/t/${created.publicToken}`"
              class="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground no-underline"
            >
              Lacak issue saya
            </NuxtLink>
            <CopyButton :text="created.publicToken" />
          </div>
        </div>
      </template>

      <template v-else>
        <h1 class="mt-2 text-4xl font-bold leading-tight text-foreground">
          Ada kendala teknis? Laporkan di sini.
        </h1>

        <form class="mt-8 rounded-md border border-border bg-card p-6" @submit.prevent="submit">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <Label for="nm">Nama Anda</Label>
              <Input id="nm" v-model="form.reporterName" required placeholder="Budi Santoso" />
            </div>
            <div>
              <Label for="dv">Divisi</Label>
              <Input id="dv" v-model="form.reporterDivision" required placeholder="Redaksi" />
            </div>
          </div>

          <div class="mt-4">
            <Label for="ct">Kategori</Label>
            <SelectField id="ct" v-model="form.category" :options="categoryOptions" />
          </div>

          <div class="mt-4">
            <Label for="tt">Judul issue</Label>
            <Input id="tt" v-model="form.title" required placeholder="CMS tidak bisa publish artikel" />
          </div>

          <div class="mt-4">
            <Label for="ds">Deskripsi</Label>
            <Textarea
              id="ds"
              v-model="form.description"
              required
              rows="6"
              placeholder="Apa yang terjadi, kapan mulai, langkah apa yang sudah dicoba, URL/halaman yang terdampak."
            />
            <p class="mt-1 text-sm text-mute-foreground">
              Makin detail, makin cepat diselesaikan.
            </p>
          </div>

          <div class="mt-4">
            <Label for="img">Lampiran gambar <span class="font-normal text-mute-foreground">(opsional)</span></Label>
            <input
              id="img"
              type="file"
              :accept="ACCEPTED_IMAGE_TYPES"
              class="block w-full text-sm text-body file:mr-3 file:h-9 file:cursor-pointer file:rounded-md file:border file:border-input file:bg-surface-soft file:px-3 file:text-sm file:font-bold file:text-foreground"
              @change="pickImage"
            />
            <p class="mt-1 text-sm text-mute-foreground">
              Screenshot sangat membantu. JPG, PNG, atau WebP — otomatis dikecilkan sebelum
              dikirim.
            </p>

            <div v-if="imagePreview" class="mt-3 flex items-start gap-3">
              <img
                :src="imagePreview"
                alt="Pratinjau lampiran"
                class="max-h-40 rounded-md border border-border"
              />
              <Button type="button" variant="secondary" class="h-9" @click="clearImage">
                Hapus
              </Button>
            </div>
          </div>

          <Button type="submit" :disabled="sending" class="mt-6 h-10 font-bold">
            {{ sending ? 'Mengirim…' : 'Kirim issue' }}
          </Button>
        </form>
      </template>
    </div>

    <aside class="lg:pt-14">
      <div class="rounded-md border border-border bg-card p-6">
        <Eyebrow>Sudah pernah lapor?</Eyebrow>
        <p class="mt-2 text-sm text-body">
          Masukkan kode pelacakan dari link yang Anda terima.
        </p>
        <form
          class="mt-3 flex gap-2"
          @submit.prevent="trackToken && navigateTo(`/t/${trackToken.trim()}`)"
        >
          <Input v-model="trackToken" placeholder="kode pelacakan" />
          <Button type="submit" variant="secondary" class="h-9 shrink-0">Lacak</Button>
        </form>
      </div>

      <div class="mt-4 rounded-md border border-border bg-tone-blue-soft p-5">
        <p class="text-sm text-foreground">
          💡 <strong>Mendesak dan menghentikan pekerjaan?</strong> Tetap lapor di sini supaya
          tercatat, lalu kabari tim IT langsung agar dinaikkan prioritasnya.
        </p>
      </div>
    </aside>
  </div>

  <PublicBoard />
</template>
