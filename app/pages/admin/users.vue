<script setup lang="ts">
import { toast } from 'vue-sonner'
import { JOB_TITLES, ROLES } from '~~/server/db/schema'
import { JOB_LABEL, toOptions, USER_STATUS_LABEL, USER_STATUS_TONE } from '~/lib/format'

useHead({ title: 'Akun staff — Kepeser' })

const { data: rows, refresh } = await useFetch('/api/users/all')
const busy = ref(false)
const form = reactive({
  name: '',
  email: '',
  password: '',
  role: 'staff' as (typeof ROLES)[number],
  jobTitle: 'support' as (typeof JOB_TITLES)[number],
})

const pending = computed(() => (rows.value ?? []).filter((u) => u.status === 'pending'))
const rejecting = ref<any>(null)
const jobOptions = toOptions(JOB_TITLES, JOB_LABEL)
const roleOptions = [
  { value: 'staff', label: 'Staff' },
  { value: 'supervisor', label: 'Supervisor (bisa approve)' },
]

async function create() {
  busy.value = true
  try {
    await $fetch('/api/users', { method: 'POST', body: form })
    Object.assign(form, { name: '', email: '', password: '' })
    await refresh()
    toast.success('Akun dibuat.')
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || 'Gagal membuat akun.')
  } finally {
    busy.value = false
  }
}

async function patch(id: number, body: any, msg: string) {
  try {
    await $fetch(`/api/users/${id}`, { method: 'PATCH', body })
    await refresh()
    toast.success(msg)
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || 'Gagal.')
  }
}

async function reject() {
  try {
    await $fetch(`/api/users/${rejecting.value.id}`, { method: 'DELETE' })
    rejecting.value = null
    await refresh()
    toast.success('Pendaftaran ditolak.')
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || 'Gagal menolak.')
  }
}

async function resetPassword(id: number) {
  const pw = prompt('Password baru (minimal 8 karakter):')
  if (pw) await patch(id, { password: pw }, 'Password direset.')
}
</script>

<template>
  <Eyebrow>Supervisor</Eyebrow>
  <h1 class="mt-1 text-2xl font-extrabold tracking-tight text-foreground">Akun staff IT</h1>

  <section
    v-if="pending.length"
    class="mt-6 rounded-md border border-border bg-tone-blue-soft p-6"
  >
    <Eyebrow>Menunggu persetujuan ({{ pending.length }})</Eyebrow>
    <p class="mt-2 text-sm text-body">
      Akun ini mendaftar sendiri dan belum bisa dipakai sampai Anda setujui.
    </p>
    <ul class="mt-4 space-y-2">
      <li
        v-for="u in pending"
        :key="u.id"
        class="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-4 py-3"
      >
        <div class="min-w-[200px] flex-1">
          <p class="font-semibold text-foreground">{{ u.name }}</p>
          <p class="text-sm text-mute-foreground">
            {{ u.email }} · {{ JOB_LABEL[u.jobTitle] || u.jobTitle }}
          </p>
        </div>
        <Button
          class="font-bold"
          @click="patch(u.id, { status: 'active' }, `${u.name} disetujui.`)"
        >
          Setujui
        </Button>
        <Button variant="secondary" @click="rejecting = u">Tolak</Button>
      </li>
    </ul>
  </section>

  <form class="mt-6 rounded-md border border-border bg-card p-6" @submit.prevent="create">
    <Eyebrow>Tambah staff</Eyebrow>
    <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Input v-model="form.name" required placeholder="Nama" />
      <Input v-model="form.email" required type="email" placeholder="email@inilah.com" />
      <Input v-model="form.password" required type="password" minlength="8" placeholder="Password awal" />
      <SelectField v-model="form.jobTitle" :options="jobOptions" />
      <SelectField v-model="form.role" :options="roleOptions" />
    </div>
    <Button type="submit" :disabled="busy" class="mt-4 font-bold">Buat akun</Button>
  </form>

  <div class="mt-6 overflow-x-auto rounded-md border border-border bg-card">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-border text-left">
          <th class="px-4 py-3 text-xs font-bold uppercase tracking-wide text-body">Nama</th>
          <th class="px-4 py-3 text-xs font-bold uppercase tracking-wide text-body">Email</th>
          <th class="px-4 py-3 text-xs font-bold uppercase tracking-wide text-body">Jabatan</th>
          <th class="px-4 py-3 text-xs font-bold uppercase tracking-wide text-body">Peran</th>
          <th class="px-4 py-3 text-xs font-bold uppercase tracking-wide text-body">Status</th>
          <th class="px-4 py-3"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in rows" :key="u.id" class="border-b border-border-soft last:border-b-0">
          <td class="px-4 py-3 font-semibold text-foreground">{{ u.name }}</td>
          <td class="px-4 py-3 text-body">{{ u.email }}</td>
          <td class="px-4 py-3 text-body">{{ JOB_LABEL[u.jobTitle] || u.jobTitle }}</td>
          <td class="px-4 py-3 text-body">{{ u.role }}</td>
          <td class="px-4 py-3">
            <span
              class="rounded-full px-2 py-0.5 text-xs font-semibold uppercase"
              :class="USER_STATUS_TONE[u.status]"
            >
              {{ USER_STATUS_LABEL[u.status] }}
            </span>
          </td>
          <td class="px-4 py-3 text-right whitespace-nowrap">
            <button class="text-sm text-link" @click="resetPassword(u.id)">Reset password</button>
            <span class="mx-2 text-stone">·</span>
            <button
              v-if="u.status !== 'pending'"
              class="text-sm text-link"
              @click="
                patch(
                  u.id,
                  { status: u.status === 'active' ? 'disabled' : 'active' },
                  u.status === 'active' ? 'Dinonaktifkan.' : 'Diaktifkan.',
                )
              "
            >
              {{ u.status === 'active' ? 'Nonaktifkan' : 'Aktifkan' }}
            </button>
            <span v-else class="text-sm text-mute-foreground">menunggu persetujuan</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <Dialog :open="!!rejecting" @update:open="(o) => !o && (rejecting = null)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Tolak pendaftaran {{ rejecting?.name }}?</DialogTitle>
        <DialogDescription>
          Akun {{ rejecting?.email }} akan dihapus. Aman — akun yang menunggu persetujuan
          belum pernah bisa login, jadi tidak ada tiket atau riwayat KPI yang ikut hilang.
          Emailnya bebas dipakai mendaftar lagi.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="secondary" @click="rejecting = null">Batal</Button>
        <Button variant="destructive" class="font-bold" @click="reject">Tolak & hapus</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
