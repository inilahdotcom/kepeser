<script setup lang="ts">
import { CATEGORY_LABEL, fmtDate } from '~/lib/format'

/**
 * Papan publik. Sengaja BUKAN memakai ulang TicketTable: komponen itu membawa
 * dropdown aksi, dialog edit/arsip, useUserSession(), dan kolom pelapor —
 * semuanya salah di sini. Satu `v-if` kelewat di sana = kebocoran data.
 */
const { data: rows } = await useFetch('/api/board')
</script>

<template>
  <section class="mt-20">
    <h2 class="mt-2 text-2xl font-extrabold tracking-tight text-foreground">
      Lagi dikerjain anak IT
    </h2>
    <p class="mt-2 max-w-[640px] text-body">
      Pekerjaan yang sedang berjalan dan yang selesai sepekan terakhir. Untuk memantau laporan Anda sendiri, gunakan kode pelacakan.
    </p>

    <div
      v-if="!rows?.length"
      class="mt-6 rounded-md border border-border bg-card p-8 text-center text-mute-foreground"
    >
      Tidak ada pekerjaan yang sedang berjalan.
    </div>

    <div v-else class="mt-6 overflow-x-auto rounded-md border border-border bg-card">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border text-left">
            <th class="px-4 py-3 text-xs font-bold uppercase tracking-wide text-body">
              Pekerjaan
            </th>
            <!-- Di bawah sm kolom sekunder disembunyikan, bukan dipaksa scroll. -->
            <th
              class="hidden px-4 py-3 text-xs font-bold uppercase tracking-wide text-body sm:table-cell"
            >
              Kategori
            </th>
            <th class="px-4 py-3 text-xs font-bold uppercase tracking-wide text-body">Status</th>
            <th
              class="hidden px-4 py-3 text-xs font-bold uppercase tracking-wide text-body md:table-cell"
            >
              Ditangani
            </th>
            <th
              class="hidden px-4 py-3 text-xs font-bold uppercase tracking-wide text-body md:table-cell"
            >
              Diperbarui
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in rows" :key="t.id" class="border-b border-border-soft last:border-b-0">
            <td class="px-4 py-3 font-medium text-foreground">
              {{ t.title }}
              <!-- Info sekunder ikut di baris kedua saat kolomnya disembunyikan. -->
              <div class="text-xs text-mute-foreground sm:hidden">
                {{ CATEGORY_LABEL[t.category] }}
                <span v-if="t.assigneeName"> · {{ t.assigneeName }}</span>
              </div>
            </td>
            <td class="hidden px-4 py-3 text-body sm:table-cell">
              {{ CATEGORY_LABEL[t.category] }}
            </td>
            <td class="px-4 py-3"><StatusBadge :status="t.status" /></td>
            <td class="hidden px-4 py-3 text-body md:table-cell">{{ t.assigneeName || '—' }}</td>
            <td class="hidden px-4 py-3 text-mute-foreground md:table-cell">
              {{ fmtDate(t.updatedAt) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
