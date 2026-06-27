import api from './axios'
import { clearSwrByPrefix, silentOverlayConfig, swr, swrKey } from './swrCache'

type ApiSwrOptions = { silent?: boolean }

export const contactsAPI = {
  getAll: async (params?: Record<string, unknown>) => {
    return swr(swrKey('contacts:list', params), async ({ silent }) => {
      const config = { params }
      const res = await api.get('/contacts', silent ? silentOverlayConfig(config) : config)
      return res.data.data
    })
  },

  getStats: async (campaignId?: number, options?: ApiSwrOptions) => {
    return swr(swrKey('contacts:stats', { campaignId }), async ({ silent }) => {
      const config = campaignId ? { params: { campaignId } } : {}
      const res = await api.get('/contacts/stats', (silent || options?.silent) ? silentOverlayConfig(config) : config)
      return res.data.data
    }, options)
  },
  getById: async (id: number | string): Promise<Record<string, unknown> | null> => {
    return swr(swrKey('contacts:detail', { id }), async ({ silent }) => {
      const res = await api.get(`/contacts/${id}`, silent ? silentOverlayConfig() : undefined)
      return (res.data?.data ?? res.data) as Record<string, unknown>
    })
  },

  getCallHistory: async (id: number | string): Promise<Record<string, unknown>[]> => {
    return swr(swrKey('contacts:calls', { id }), async ({ silent }) => {
      const res = await api.get(`/contacts/${id}/calls`, silent ? silentOverlayConfig() : undefined)
      const data = res.data?.data ?? res.data
      if (Array.isArray(data)) return data as Record<string, unknown>[]
      if (Array.isArray(data?.calls)) return data.calls as Record<string, unknown>[]
      if (Array.isArray(data?.items)) return data.items as Record<string, unknown>[]
      return []
    })
  },

  create: async (data: Record<string, unknown>) => {
    const res = await api.post('/contacts', data)
    clearSwrByPrefix('contacts')
    return res.data.data
  },

  uploadCSV: async (campaignId: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    const res = await api.post(`/contacts/upload/${campaignId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    clearSwrByPrefix('contacts')
    return res.data.data
  },

  update: async (id: number, data: Record<string, unknown>) => {
    const res = await api.put(`/contacts/${id}`, data)
    clearSwrByPrefix('contacts')
    return res.data.data
  },

  delete: async (id: number) => {
    await api.delete(`/contacts/${id}`)
    clearSwrByPrefix('contacts')
  },
}
