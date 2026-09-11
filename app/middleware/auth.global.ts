const PUBLIC = ['/', '/login', '/daftar']

/** Guard UX saja — penentu sesungguhnya `requireUser`/`requireRole` di server. */
export default defineNuxtRouteMiddleware((to) => {
  if (PUBLIC.includes(to.path) || to.path.startsWith('/t/')) return

  const { loggedIn, user } = useUserSession()
  if (!loggedIn.value) return navigateTo(`/login?next=${encodeURIComponent(to.fullPath)}`)

  const supervisorOnly = ['/inbox', '/kpi', '/admin']
  if (supervisorOnly.some((p) => to.path.startsWith(p)) && user.value?.role !== 'supervisor')
    return navigateTo('/tickets')
})
