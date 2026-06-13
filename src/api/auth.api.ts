import api from './axios'

export const authAPI = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password })
    return res.data.data
  },

  getProfile: async () => {
    const res = await api.get('/auth/profile')
    return res.data.data
  },

  logout: async (token?: string | null) => {
    await api.post('/auth/logout', undefined, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
  },
}
