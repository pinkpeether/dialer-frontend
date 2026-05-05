import { create } from 'zustand'

interface User {
  id: number
  agentCode: string
  name: string
  email: string
  role: 'ADMIN' | 'SUPERVISOR' | 'AGENT'
  status: string
}

interface AuthStore {
  user:    User | null
  token:   string | null
  isAuth:  boolean
  setAuth: (user: User, token: string) => void
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

  logout: () => {
    localStorage.removeItem('jd_token')
    localStorage.removeItem('jd_user')
    set({ user: null, token: null, isAuth: false })
  },
}))