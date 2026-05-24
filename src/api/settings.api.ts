import api from './axios'

export const settingsAPI = {
  getAll: async () => {
    const res = await api.get('/settings')
    return res.data.data
  },
  update: async (data: Record<string, unknown>) => {
    const res = await api.patch('/settings', data)
    return res.data.data
  },
}
