import api from './axios'
import { clearSwrByPrefix, silentOverlayConfig, swr, swrKey } from './swrCache'

type ApiSwrOptions = { silent?: boolean }

export const campaignsAPI = {
  getAll: async (params?: Record<string, unknown>, options?: ApiSwrOptions) => {
    return swr(swrKey('campaigns:list', params), async ({ silent }) => {
      const config = { params }
      const res = await api.get('/campaigns', (silent || options?.silent) ? silentOverlayConfig(config) : config)
      return res.data.data
    }, options)
  },

  getById: async (id: number) => {
    return swr(swrKey('campaigns:detail', { id }), async ({ silent }) => {
      const res = await api.get(`/campaigns/${id}`, silent ? silentOverlayConfig() : undefined)
      return res.data.data
    })
  },

  getStats: async (options?: ApiSwrOptions) => {
    return swr('campaigns:stats:{}', async ({ silent }) => {
      const res = await api.get('/campaigns/stats', (silent || options?.silent) ? silentOverlayConfig() : undefined)
      return res.data.data
    }, options)
  },

  create: async (data: Record<string, unknown>) => {
    const res = await api.post('/campaigns', data)
    clearSwrByPrefix('campaigns')
    return res.data.data
  },

  update: async (id: number, data: Record<string, unknown>) => {
    const res = await api.put(`/campaigns/${id}`, data)
    clearSwrByPrefix('campaigns')
    return res.data.data
  },

  updateStatus: async (id: number, status: string) => {
    const res = await api.patch(`/campaigns/${id}/status`, { status })
    clearSwrByPrefix('campaigns')
    return res.data.data
  },

  clone: async (id: number) => {
    const res = await api.post(`/campaigns/${id}/clone`)
    clearSwrByPrefix('campaigns')
    return res.data.data
  },

  delete: async (id: number) => {
    await api.delete(`/campaigns/${id}`)
    clearSwrByPrefix('campaigns')
  },
}
