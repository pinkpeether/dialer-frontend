import api from './axios'

export type DncEntry = {
  id: number | string
  phone: string
  reason?: string | null
  addedBy?: string | null
  createdAt?: string
}

export const dncAPI = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }): Promise<DncEntry[]> => {
    try {
      const res = await api.get('/dnc', { params })
      const data = res.data?.data ?? res.data
      if (Array.isArray(data)) return data as DncEntry[]
      if (Array.isArray(data?.entries)) return data.entries as DncEntry[]
      if (Array.isArray(data?.items)) return data.items as DncEntry[]
      return []
    } catch {
      return []
    }
  },

  add: async (phone: string, reason?: string): Promise<void> => {
    await api.post('/dnc', { phone, reason })
  },

  remove: async (id: number | string): Promise<void> => {
    await api.delete(`/dnc/${id}`)
  },

  check: async (phone: string): Promise<boolean> => {
    try {
      const res = await api.get('/dnc/check', { params: { phone } })
      return Boolean(res.data?.isDnc ?? res.data?.blocked ?? false)
    } catch {
      return false
    }
  },
}