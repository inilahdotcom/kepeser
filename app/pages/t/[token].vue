<script setup lang="ts">
import { CATEGORY_LABEL, EVENT_LABEL, fmtDate, PRIORITY_LABEL } from '~/lib/format'

definePageMeta({ layout: 'public' })
const route = useRoute()
const { data, error } = await useFetch(`/api/track/${route.params.token}`)
useHead({ title: () => (data.value ? `#${data.value.ticket.id} — Kepeser` : 'Kepeser') })

const imageUrl = computed(() =>
  data.value ? `/api/tickets/${data.value.ticket.id}/image?token=${route.params.token}` : '',
)
</script>

<template>
  <div v-if="error" class="rounded-md border border-border bg-tone-red-soft p-6">
    <p class="font-bold text-foreground">Tiket tidak ditemukan</p>
    <p class="mt-1 text-body">
      Kode pelacakan salah atau sudah tidak berlaku.
      <NuxtLink to="/">Kembali ke form laporan</NuxtLink>.
    </p>
  </div>

  <div v-else-if="data" class="grid gap-8 lg:grid-cols-[1fr_320px]">
    <div>
      <Eyebrow>Tiket #{{ data.ticket.id }}</Eyebrow>
      <div class="mt-2 flex flex-wrap items-center gap-3">
        <h1 class="text-2xl font-extrabold tracking-tight text-foreground">
          {{ data.ticket.title }}
        </h1>
        <StatusBadge :status="data.ticket.status" />
      </div>

      <div
        v-if="data.ticket.archivedAt"
        class="mt-6 rounded-md border border-border bg-surface-soft p-5"
      >
        <p class="text-body">
          📦 <strong class="text-foreground">Tiket ini diarsipkan</strong> oleh tim IT pada
          {{ fmtDate(data.ticket.archivedAt) }}. Riwayatnya tetap bisa dilihat di bawah.
          Hubungi tim IT kalau menurut Anda ini keliru.
        </p>
      </div>

      <div class="mt-6 rounded-md border border-border bg-card p-6">
        <p class="whitespace-pre-wrap text-body">{{ data.ticket.description }}</p>

        <figure v-if="data.ticket.hasImage" class="mt-5">
          <figcaption class="text-xs font-bold uppercase tracking-wide text-body">
            Lampiran Anda
          </figcaption>
          <!-- Pelapor tidak punya akun; token tiketnya yang jadi izin akses. -->
          <a :href="imageUrl" target="_blank" rel="noopener">
            <img
              :src="imageUrl"
              alt="Lampiran Anda"
              class="mt-2 max-h-96 rounded-md border border-border"
            />
          </a>
        </figure>
      </div>

      <div
        v-if="data.ticket.status === 'rejected' && data.ticket.rejectReason"
        class="mt-4 rounded-md border border-border bg-tone-red-soft p-5"
      >
        <p class="text-foreground">
          ⚠️ <strong>Ditolak:</strong> {{ data.ticket.rejectReason }}
        </p>
      </div>

      <div class="mt-6 flex flex-wrap items-center gap-3">
        <CopyButton :text="String($route.params.token)" />
        <p class="text-sm text-mute-foreground">
          Simpan kode ini untuk membuka halaman pelacakan kapan pun.
        </p>
      </div>

      <h2 class="mt-8 text-lg font-bold text-foreground">Riwayat</h2>
      <ol class="mt-3 rounded-md border border-border bg-card">
        <li
          v-for="e in data.events"
          :key="e.id"
          class="border-b border-border-soft px-5 py-3 text-sm last:border-b-0"
        >
          <span class="font-semibold text-foreground">{{ e.actorName || 'Sistem' }}</span>
          <span class="text-body"> {{ EVENT_LABEL[e.type] || e.type }}</span>
          <span v-if="e.note" class="text-body"> — {{ e.note }}</span>
          <span class="ml-1 text-mute-foreground">· {{ fmtDate(e.createdAt) }}</span>
        </li>
      </ol>
    </div>

    <aside>
      <dl class="rounded-md border border-border bg-card p-6 text-sm">
        <div class="flex justify-between gap-4 border-b border-border-soft pb-2">
          <dt class="text-mute-foreground">Pelapor</dt>
          <dd class="text-right font-medium text-foreground">
            {{ data.ticket.reporterName }}<br />
            <span class="text-mute-foreground">{{ data.ticket.reporterDivision }}</span>
          </dd>
        </div>
        <div class="flex justify-between gap-4 border-b border-border-soft py-2">
          <dt class="text-mute-foreground">Kategori</dt>
          <dd class="font-medium text-foreground">{{ CATEGORY_LABEL[data.ticket.category] }}</dd>
        </div>
        <div class="flex justify-between gap-4 border-b border-border-soft py-2">
          <dt class="text-mute-foreground">Prioritas</dt>
          <dd class="font-medium text-foreground">{{ PRIORITY_LABEL[data.ticket.priority] }}</dd>
        </div>
        <div class="flex justify-between gap-4 border-b border-border-soft py-2">
          <dt class="text-mute-foreground">Ditangani</dt>
          <dd class="font-medium text-foreground">{{ data.ticket.assigneeName || 'Belum' }}</dd>
        </div>
        <div class="flex justify-between gap-4 border-b border-border-soft py-2">
          <dt class="text-mute-foreground">Target selesai</dt>
          <dd class="font-medium text-foreground">{{ fmtDate(data.ticket.dueAt) }}</dd>
        </div>
        <div class="flex justify-between gap-4 pt-2">
          <dt class="text-mute-foreground">Dilaporkan</dt>
          <dd class="font-medium text-foreground">{{ fmtDate(data.ticket.createdAt) }}</dd>
        </div>
      </dl>
    </aside>
  </div>
</template>
