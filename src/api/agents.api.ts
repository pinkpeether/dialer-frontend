import api from './axios'

export const agentsAPI = {
  getAll: async (params?: {
    page?: number
    limit?: number
    search?: string
    status?: string
    isActive?: boolean
  }) => {
    const res = await api.get('/agents', { params })
    return res.data.data
  },

  getById: async (id: number) => {
    const res = await api.get(`/agents/${id}`)
    return res.data.data
  },

  getStats: async () => {
    const res = await api.get('/agents/stats')
    return res.data.data
  },

  create: async (data: {
    name: string
    email: string
    password: string
    role?: string
    extension?: string
    phone?: string
  }) => {
    const res = await api.post('/agents', data)
    return res.data.data
  },

  update: async (id: number, data: Record<string, unknown>) => {
    const res = await api.put(`/agents/${id}`, data)
    return res.data.data
  },

  setActive: async (id: number, isActive: boolean) => {
    const res = await api.put(`/agents/${id}`, { isActive })
    return res.data.data
  },

  finalRemove: async (id: number) => {
    const res = await api.post(`/agents/${id}/final-remove`)
    return res.data.data
  },

  updateStatus: async (id: number, status: string) => {
    const res = await api.patch(`/agents/${id}/status`, { status })
    return res.data.data
  },

  updateMyStatus: async (status: string) => {
    const res = await api.patch('/agents/me/status', { status })
    return res.data.data
  },

  delete: async (id: number) => {
    await api.delete(`/agents/${id}`)
  },
}