import api from './axios'

export const contactsAPI = {
  getAll: async (params?: Record<string, unknown>) => {
    const res = await api.get('/contacts', { params })
    return res.data.data
  },

  getStats: async (campaignId?: number) => {
    const res = await api.get('/contacts/stats',
      campaignId ? { params: { campaignId } } : {}
    )
    return res.data.data
  },
  getById: async (id: number | string): Promise<Record<string, unknown> | null> => {
    try {
      const res = await api.get(`/contacts/${id}`)
      return (res.data?.data ?? res.data) as Record<string, unknown>
    } catch {
      return null
    }
  },

  getCallHistory: async (id: number | string): Promise<Record<string, unknown>[]> => {
    try {
      const res = await api.get(`/contacts/${id}/calls`)
      const data = res.data?.data ?? res.data
      if (Array.isArray(data)) return data as Record<string, unknown>[]
      if (Array.isArray(data?.calls)) return data.calls as Record<string, unknown>[]
      if (Array.isArray(data?.items)) return data.items as Record<string, unknown>[]
      return []
    } catch {
      return []
    }
  },

  create: async (data: Record<string, unknown>) => {
    const res = await api.post('/contacts', data)
    return res.data.data
  },

  uploadCSV: async (campaignId: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    const res = await api.post(`/contacts/upload/${campaignId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return res.data.data
  },

  update: async (id: number, data: Record<string, unknown>) => {
    const res = await api.put(`/contacts/${id}`, data)
    return res.data.data
  },

  delete: async (id: number) => {
    await api.delete(`/contacts/${id}`)
  },
}
