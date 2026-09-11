<script setup lang="ts">
import { toast } from 'vue-sonner'
import { JOB_TITLES } from '~~/server/db/schema'
import { JOB_LABEL, toOptions } from '~/lib/format'

definePageMeta({ layout: 'public' })
useHead({ title: 'Daftar akun staff IT — Kepeser' })

// Jabatan supervisor tidak ditawarkan: peran ditentukan server, dan supervisor
// bisa menaikkan seseorang nanti lewat /admin/users.
const jobOptions = toOptions(
  JOB_TITLES.filter((j) => j !== 'supervisor'),
  JOB_LABEL,
)

const form = reactive({ name: '', email: '', password: '', jobTitle: 'support' })
const confirm = ref('')
const busy = ref(false)
const done = ref(false)

async function submit() {
  if (form.password !== confirm.value) return toast.error('Konfirmasi password tidak cocok.')
  busy.value = true
  try {
    await $fetch('/api/auth/register', { method: 'POST', body: form })
    done.value = true
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || 'Gagal mendaftar.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-[420px]">
    <template v-if="done">
      <div class="rounded-md border border-border bg-tone-green-soft p-6">
        <p class="text-lg font-bold text-foreground">✅ Pendaftaran terkirim</p>
        <p class="mt-2 text-body">
          Akun Anda menunggu persetujuan supervisor IT. Setelah disetujui, login dengan email
          dan password yang barusan Anda buat.
        </p>
        <NuxtLink
          to="/login"
          class="mt-4 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground no-underline"
        >
          Ke halaman login
        </NuxtLink>
      </div>
    </template>

    <template v-else>
      <Eyebrow>Staff IT</Eyebrow>
      <h1 class="mt-2 text-2xl font-extrabold tracking-tight text-foreground">Daftar akun</h1>
      <p class="mt-2 text-body">
        Akun baru bisa dipakai setelah disetujui supervisor IT.
      </p>

      <form class="mt-6 grid gap-4 rounded-md border border-border bg-card p-6" @submit.prevent="submit">
        <div>
          <Label for="rg-n">Nama lengkap</Label>
          <Input id="rg-n" v-model="form.name" required autocomplete="name" />
        </div>
        <div>
          <Label for="rg-e">Email kantor</Label>
          <Input id="rg-e" v-model="form.email" type="email" required autocomplete="email" />
        </div>
        <div>
          <Label for="rg-j">Jabatan</Label>
          <SelectField id="rg-j" v-model="form.jobTitle" :options="jobOptions" />
        </div>
        <div>
          <Label for="rg-p">Password</Label>
          <Input
            id="rg-p"
            v-model="form.password"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
          />
          <p class="mt-1 text-sm text-mute-foreground">Minimal 8 karakter.</p>
        </div>
        <div>
          <!-- Tidak ada alur reset mandiri: salah ketik = terkunci sampai supervisor mereset. -->
          <Label for="rg-c">Ulangi password</Label>
          <Input id="rg-c" v-model="confirm" type="password" required autocomplete="new-password" />
        </div>
        <Button type="submit" :disabled="busy" class="mt-2 h-10 w-full font-bold">
          {{ busy ? 'Mengirim…' : 'Daftar' }}
        </Button>
      </form>

      <p class="mt-4 text-center text-sm text-mute-foreground">
        Sudah punya akun? <NuxtLink to="/login">Masuk di sini</NuxtLink>.
      </p>
    </template>
  </div>
</template>
