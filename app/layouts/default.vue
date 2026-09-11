<script setup lang="ts">
import { LayoutDashboard, Inbox, User, BarChart3, Users, LogOut } from '@lucide/vue'

const { user, clear } = useUserSession()
const isSupervisor = computed(() => user.value?.role === 'supervisor')

// Satu angka dari ~15 baris — endpoint /api/users/all sudah ada dan sudah
// supervisor-only, jadi tidak perlu endpoint baru untuk menghitungnya.
const { data: allUsers } = await useFetch('/api/users/all', {
  // Endpoint-nya supervisor-only; staff tidak perlu memanggilnya sama sekali.
  immediate: isSupervisor.value,
  default: () => [],
})
const pendingCount = computed(
  () => (allUsers.value ?? []).filter((u) => u.status === 'pending').length,
)

const nav = computed(() =>
  [
    { to: '/tickets', label: 'Tiket', icon: LayoutDashboard, show: true },
    { to: '/inbox', label: 'Approval', icon: Inbox, show: isSupervisor.value },
    { to: '/me', label: 'Performa saya', icon: User, show: true },
    { to: '/kpi', label: 'KPI tim', icon: BarChart3, show: isSupervisor.value },
    {
      to: '/admin/users',
      label: 'Akun',
      icon: Users,
      show: isSupervisor.value,
      badge: pendingCount.value,
    },
  ].filter((i) => i.show),
)

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <div class="min-h-dvh bg-background">
    <header class="border-b border-border">
      <div class="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-6">
        <NuxtLink to="/tickets" class="font-bold text-foreground no-underline">Kepeser</NuxtLink>
        <div class="flex items-center gap-3">
          <span class="hidden text-sm text-body sm:inline">{{ user?.name }}</span>
          <button
            class="flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-bold text-foreground"
            @click="logout"
          >
            <LogOut class="size-4" /> Keluar
          </button>
        </div>
      </div>
    </header>

    <!-- sub-nav strip: surface-soft, 40px, rounded-none (DESIGN.md) -->
    <nav class="border-b border-border bg-surface-soft">
      <div class="mx-auto flex h-10 max-w-[1280px] items-center gap-1 overflow-x-auto px-6">
        <NuxtLink
          v-for="i in nav"
          :key="i.to"
          :to="i.to"
          class="flex h-full shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 text-sm font-medium text-body no-underline"
          active-class="!border-foreground !text-foreground font-semibold"
        >
          <component :is="i.icon" class="size-4" />
          {{ i.label }}
          <span
            v-if="i.badge"
            class="ml-0.5 rounded-full bg-tone-blue-soft px-1.5 text-xs font-bold text-tone-blue"
          >
            {{ i.badge }}
          </span>
        </NuxtLink>
      </div>
    </nav>

    <main class="mx-auto max-w-[1280px] px-6 py-8">
      <slot />
    </main>
  </div>
</template>
