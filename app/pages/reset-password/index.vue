<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({ layout: 'public' })
useHead({ title: 'Reset Password — Kepeser' })

const form = reactive({ email: '' })
const busy = ref(false)
const terkirim = ref(false)

async function submit() {
  busy.value = true
  try {
    await $fetch('/api/auth/forgot-password', { method: 'POST', body: form })
    // Server sengaja tidak memberi tahu apakah emailnya terdaftar, jadi halaman
    // ini pun tidak boleh — pesannya sama untuk semua kasus.
    terkirim.value = true
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || 'Gagal mengirim permintaan.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-[380px]">
    <template v-if="terkirim">
      <div class="rounded-md border border-border bg-tone-green-soft p-6">
        <p class="text-lg font-bold text-foreground">✅ Permintaan terkirim</p>
        <p class="mt-2 text-body">
          Kalau <strong>{{ form.email }}</strong> terdaftar, tautan reset sudah dikirim ke
          sana. Cek kotak masuk dan folder spam. Tautannya berlaku 1 jam.
        </p>
        <NuxtLink
          to="/login"
          class="mt-4 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground no-underline"
        >
          Kembali ke login
        </NuxtLink>
      </div>
    </template>

    <template v-else>
      <Eyebrow>Staff IT</Eyebrow>
      <h1 class="mt-2 text-2xl font-extrabold tracking-tight text-foreground">Reset password</h1>
      <p class="mt-2 text-body">
        Masukkan email akun Anda. Kami kirim tautan untuk membuat password baru.
      </p>

      <form
        class="mt-6 grid gap-4 rounded-md border border-border bg-card p-6"
        @submit.prevent="submit"
      >
        <div>
          <Label for="email">Email</Label>
          <Input
            id="email"
            v-model="form.email"
            type="email"
            required
            autocomplete="email"
            placeholder="nama@inilah.com"
          />
        </div>
        <Button type="submit" :disabled="busy" class="mt-2 h-10 w-full font-bold">
          {{ busy ? 'Mengirim…' : 'Kirim tautan reset' }}
        </Button>
      </form>

      <p class="mt-4 text-center text-sm text-mute-foreground">
        Ingat password Anda? <NuxtLink to="/login">Masuk di sini</NuxtLink>.
      </p>
    </template>
  </div>
</template>
