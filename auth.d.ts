declare module '#auth-utils' {
  interface User {
    id: number
    name: string
    email: string
    role: 'supervisor' | 'staff'
    jobTitle: string
  }
}
export {}
