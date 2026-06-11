import { create } from 'zustand'

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER_ADMIN' | 'MANAGER' | 'SUPERVISOR' | 'AGENT'

export interface User {
  id: number
  agentCode: string
  name: string
  email: string
  role: UserRole
  status: string
  phone?: string | null
  extension?: string | null
}

interface AuthStore {
  user:    User | null
  token:   string | null
  isAuth:  boolean
  setAuth: (user: User, token: string) => void
  updateUser: (patch: Partial<User>) => void
  logout:  () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user:   JSON.parse(localStorage.getItem('jd_user') || 'null'),
  token:  localStorage.getItem('jd_token'),
  isAuth: !!localStorage.getItem('jd_token'),

  setAuth: (user, token) => {
    localStorage.setItem('jd_token', token)
    localStorage.setItem('jd_user', JSON.stringify(user))
    set({ user, token, isAuth: true })
  },

  updateUser: (patch) => set((state) => {
    if (!state.user) return state
    const user = { ...state.user, ...patch }
    localStorage.setItem('jd_user', JSON.stringify(user))
    return { user }
  }),

  logout: () => {
    localStorage.removeItem('jd_token')
    localStorage.removeItem('jd_user')
    set({ user: null, token: null, isAuth: false })
  },
}))
