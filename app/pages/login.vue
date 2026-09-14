<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({ layout: 'public' })
useHead({ title: 'Login staff IT — Kepeser' })

const route = useRoute()
const { fetch: refreshSession } = useUserSession()
const form = reactive({ email: '', password: '' })
const busy = ref(false)

async function submit() {
  busy.value = true
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: form })
    await refreshSession()
    await navigateTo((route.query.next as string) || '/tickets')
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || 'Login gagal.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-[380px]">
    <Eyebrow>Staff IT</Eyebrow>
    <h1 class="mt-2 text-2xl font-extrabold tracking-tight text-foreground">Masuk ke Kepeser</h1>
    <form class="mt-6 grid gap-4 rounded-md border border-border bg-card p-6" @submit.prevent="submit">
      <div>
        <Label for="em">Email</Label>
        <Input id="em" v-model="form.email" type="email" required autocomplete="username" />
      </div>
      <div>
        <Label for="pw">Password</Label>
        <Input
          id="pw"
          v-model="form.password"
          type="password"
          required
          autocomplete="current-password"
        />
      </div>
      <Button type="submit" :disabled="busy" class="mt-2 h-10 w-full font-bold">
        {{ busy ? 'Memeriksa…' : 'Masuk' }}
      </Button>
      <p class="text-sm text-mute-foreground">
        <NuxtLink to="/reset-password">Lupa password</NuxtLink>
      </p>
    </form>
    <p class="mt-4 text-center text-sm text-mute-foreground">
      Belum punya akun? <NuxtLink to="/daftar">Daftar di sini</NuxtLink>.
    </p>
    <p class="mt-2 text-center text-sm text-mute-foreground">
      Bukan staff IT? <NuxtLink to="/">Lapor issue di sini</NuxtLink>.
    </p>
  </div>
</template>
