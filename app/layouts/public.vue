<script setup lang="ts">
const { loggedIn } = useUserSession()
</script>

<template>
  <div class="min-h-dvh bg-background">
    <header class="h-14 border-b border-border">
      <div class="mx-auto flex h-full max-w-[1280px] items-center justify-between px-6">
        <NuxtLink to="/" class="font-bold text-foreground no-underline">
          Kepeser <span class="font-normal text-mute-foreground">· IT inilah.com</span>
        </NuxtLink>
        <NuxtLink
          :to="loggedIn ? '/tickets' : '/login'"
          class="text-sm font-semibold text-foreground no-underline"
        >
          {{ loggedIn ? 'Buka dashboard' : 'Login staff IT' }}
        </NuxtLink>
      </div>
    </header>
    <main class="mx-auto max-w-[1280px] px-6 py-12">
      <slot />
    </main>
  </div>
</template>
