<script setup lang="ts">
import { toast } from 'vue-sonner'
import { RANGE_OPTIONS } from '~/lib/format'

useHead({ title: 'Performa saya — Kepeser' })

const { user } = useUserSession()
const range = ref<number>(30)
const now = Math.floor(Date.now() / 1000)
const kpiQuery = computed(() => ({ from: now - range.value * 86400, to: now }))

const { data: kpi } = await useFetch('/api/kpi', { query: kpiQuery })
const { data: mine } = await useFetch('/api/tickets', { query: { mine: '1' } })

const me = computed(() => kpi.value?.staff.find((s: any) => s.id === user.value?.id))
const pw = reactive({ currentPassword: '', newPassword: '', konfirmasi: '' })
const pwBusy = ref(false)

async function gantiPassword() {
  if (pw.newPassword !== pw.konfirmasi) return toast.error('Konfirmasi password tidak cocok.')
  pwBusy.value = true
  try {
    await $fetch('/api/auth/change-password', {
      method: 'POST',
      body: { currentPassword: pw.currentPassword, newPassword: pw.newPassword },
    })
    Object.assign(pw, { currentPassword: '', newPassword: '', konfirmasi: '' })
    toast.success('Password berhasil diganti.')
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || 'Gagal mengganti password.')
  } finally {
    pwBusy.value = false
  }
}

const active = computed(() =>
  (mine.value || []).filter((t: any) => t.status === 'approved' || t.status === 'in_progress'),
)
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <Eyebrow>{{ user?.name }}</Eyebrow>
      <h1 class="mt-1 text-2xl font-extrabold tracking-tight text-foreground">Performa saya</h1>
    </div>
    <div class="flex items-center gap-2">
      <SelectField v-model="range" size="sm" :options="RANGE_OPTIONS" class="w-36 sm:w-44" />
      <NewTicketDialog @created="refreshNuxtData()" />
    </div>
  </div>

  <div class="mt-6">
    <KpiCards v-if="me" :kpi="me.kpi" />
  </div>

  <h2 class="mt-10 text-lg font-bold text-foreground">
    Tugas aktif <span class="text-mute-foreground">({{ active.length }})</span>
  </h2>
  <TicketTable :rows="active" @changed="refreshNuxtData()" />

  <h2 class="mt-10 text-lg font-bold text-foreground">Semua tugas saya</h2>
  <TicketTable :rows="mine || []" @changed="refreshNuxtData()" />

  <h2 class="mt-10 text-lg font-bold text-foreground">Ganti password</h2>
  <form
    class="mt-4 grid max-w-[380px] gap-4 rounded-md border border-border bg-card p-6"
    @submit.prevent="gantiPassword"
  >
    <div>
      <!-- Password lama wajib: tanpa itu, laptop yang ditinggal terbuka cukup
           untuk membajak akun secara permanen. -->
      <Label for="pw-lama">Password saat ini</Label>
      <Input
        id="pw-lama"
        v-model="pw.currentPassword"
        type="password"
        required
        autocomplete="current-password"
      />
    </div>
    <div>
      <Label for="pw-baru">Password baru</Label>
      <Input
        id="pw-baru"
        v-model="pw.newPassword"
        type="password"
        required
        minlength="8"
        autocomplete="new-password"
      />
      <p class="mt-1 text-sm text-mute-foreground">Minimal 8 karakter.</p>
    </div>
    <div>
      <Label for="pw-ulang">Ulangi password baru</Label>
      <Input
        id="pw-ulang"
        v-model="pw.konfirmasi"
        type="password"
        required
        autocomplete="new-password"
      />
    </div>
    <Button type="submit" :disabled="pwBusy" class="mt-2 h-10 font-bold">
      {{ pwBusy ? 'Menyimpan…' : 'Simpan password' }}
    </Button>
  </form>
</template>
