<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({ layout: 'public' })
useHead({ title: 'Password baru — Kepeser' })

const route = useRoute()
const token = String(route.params.token)

// Diperiksa lebih dulu supaya orang tahu tautannya kedaluwarsa SEBELUM mengetik
// password baru, bukan sesudah.
const { data: cek } = await useFetch(`/api/auth/reset-password/${token}`)

const PESAN: Record<string, string> = {
  expired: 'Tautan ini sudah kedaluwarsa. Tautan reset hanya berlaku 1 jam.',
  used: 'Tautan ini sudah dipakai untuk mengganti password.',
  unknown: 'Tautan ini tidak valid. Mungkin salah salin atau sudah diganti tautan baru.',
}

const form = reactive({ password: '', konfirmasi: '' })
const busy = ref(false)
const selesai = ref(false)

async function submit() {
  if (form.password !== form.konfirmasi) return toast.error('Konfirmasi password tidak cocok.')
  busy.value = true
  try {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: { token, password: form.password },
    })
    selesai.value = true
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || 'Gagal mengganti password.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-[380px]">
    <div v-if="selesai" class="rounded-md border border-border bg-tone-green-soft p-6">
      <p class="text-lg font-bold text-foreground">✅ Password berhasil diganti</p>
      <p class="mt-2 text-body">Silakan masuk dengan password baru Anda.</p>
      <NuxtLink
        to="/login"
        class="mt-4 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground no-underline"
      >
        Ke halaman login
      </NuxtLink>
    </div>

    <div
      v-else-if="cek?.state !== 'valid'"
      class="rounded-md border border-border bg-tone-red-soft p-6"
    >
      <p class="text-lg font-bold text-foreground">Tautan tidak bisa dipakai</p>
      <p class="mt-2 text-body">{{ PESAN[cek?.state ?? 'unknown'] }}</p>
      <NuxtLink
        to="/reset-password"
        class="mt-4 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground no-underline"
      >
        Minta tautan baru
      </NuxtLink>
    </div>

    <template v-else>
      <Eyebrow>Staff IT</Eyebrow>
      <h1 class="mt-2 text-2xl font-extrabold tracking-tight text-foreground">Password baru</h1>
      <p class="mt-2 text-body">Buat password baru untuk akun Anda.</p>

      <form
        class="mt-6 grid gap-4 rounded-md border border-border bg-card p-6"
        @submit.prevent="submit"
      >
        <div>
          <Label for="pw">Password baru</Label>
          <Input
            id="pw"
            v-model="form.password"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
          />
          <p class="mt-1 text-sm text-mute-foreground">Minimal 8 karakter.</p>
        </div>
        <div>
          <Label for="pw2">Ulangi password baru</Label>
          <Input
            id="pw2"
            v-model="form.konfirmasi"
            type="password"
            required
            autocomplete="new-password"
          />
        </div>
        <Button type="submit" :disabled="busy" class="mt-2 h-10 w-full font-bold">
          {{ busy ? 'Menyimpan…' : 'Simpan password baru' }}
        </Button>
      </form>
    </template>
  </div>
</template>
