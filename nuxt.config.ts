// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['shadcn-nuxt', 'nuxt-auth-utils', '@vite-pwa/nuxt'],

  css: ['~/assets/css/tailwind.css'],
  vite: {
    plugins: [tailwindcss()],
  },

  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },

  nitro: {
    // better-sqlite3 modul native — jangan dibundel, biarkan di-require saat runtime.
    externals: { external: ['better-sqlite3'] },
  },

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || './data/kepeser.db',
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Kepeser — IT inilah.com',
      short_name: 'Kepeser',
      description: 'Sistem ticket monitoring & task management tim IT inilah.com',
      lang: 'id',
      theme_color: '#f7a501',
      background_color: '#eeefe9',
      display: 'standalone',
      start_url: '/',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      // ponytail: precache app shell saja. Tidak ada antrean tulis offline —
      // lihat "Yang sengaja dilewati" di plan.
      navigateFallback: undefined,
      globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
    },
    client: { installPrompt: true },
    devOptions: { enabled: false },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'id' },
      title: 'Kepeser — IT inilah.com',
      meta: [{ name: 'theme-color', content: '#f7a501' }],
      link: [
        { rel: 'icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    },
  },
})
