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