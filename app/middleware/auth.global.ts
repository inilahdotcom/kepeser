const PUBLIC = ['/', '/login', '/daftar', '/reset-password']

/** Guard UX saja — penentu sesungguhnya `requireUser`/`requireRole` di server. */
export default defineNuxtRouteMiddleware((to) => {
  // startsWith untuk /reset-password/ — pencocokan persis tidak menjangkau
  // /reset-password/<token>, dan tautan dari email harus bisa dibuka tanpa login.
  if (PUBLIC.includes(to.path) || to.path.startsWith('/t/') || to.path.startsWith('/reset-password/'))
    return

  const { loggedIn, user } = useUserSession()
  if (!loggedIn.value) return navigateTo(`/login?next=${encodeURIComponent(to.fullPath)}`)

  const supervisorOnly = ['/inbox', '/kpi', '/admin']
  if (supervisorOnly.some((p) => to.path.startsWith(p)) && user.value?.role !== 'supervisor')
    return navigateTo('/tickets')
})
