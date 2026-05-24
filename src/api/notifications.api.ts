import api from './axios'

export const notificationsAPI = {
  getAll: async (params?: Record<string, unknown>) => {
    const res = await api.get('/notifications', { params })
    return res.data.data
  },
  markRead: async (id: number | string) => {
    const res = await api.patch(`/notifications/${id}/read`)
    return res.data.data
  },
  markAllRead: async () => {
    const res = await api.patch('/notifications/read-all')
    return res.data.data
  },
}
