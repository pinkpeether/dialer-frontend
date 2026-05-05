import api from './axios'

export const campaignsAPI = {
  getAll: async (params?: Record<string, unknown>) => {
    const res = await api.get('/campaigns', { params })
    return res.data.data
  },

  getById: async (id: number) => {
    const res = await api.get(`/campaigns/${id}`)
    return res.data.data
  },

  getStats: async () => {
    const res = await api.get('/campaigns/stats')
    return res.data.data
  },

  create: async (data: Record<string, unknown>) => {
    const res = await api.post('/campaigns', data)
    return res.data.data
  },

  update: async (id: number, data: Record<string, unknown>) => {
    const res = await api.put(`/campaigns/${id}`, data)
    return res.data.data
  },

  updateStatus: async (id: number, status: string) => {
    const res = await api.patch(`/campaigns/${id}/status`, { status })
    return res.data.data
  },

  clone: async (id: number) => {
    const res = await api.post(`/campaigns/${id}/clone`)
    return res.data.data
  },

  delete: async (id: number) => {
    await api.delete(`/campaigns/${id}`)
  },
}