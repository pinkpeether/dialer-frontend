import api from './axios'
import { clearSwrByPrefix, silentOverlayConfig, swr, swrKey } from './swrCache'

type ApiSwrOptions = { silent?: boolean }

export const agentsAPI = {
  getAll: async (params?: {
    page?: number
    limit?: number
    search?: string
    status?: string
    isActive?: boolean
  }) => {
    return swr(swrKey('agents:list', params), async ({ silent }) => {
      const config = { params }
      const res = await api.get('/agents', silent ? silentOverlayConfig(config) : config)
      return res.data.data
    })
  },

  getById: async (id: number) => {
    return swr(swrKey('agents:detail', { id }), async ({ silent }) => {
      const res = await api.get(`/agents/${id}`, silent ? silentOverlayConfig() : undefined)
      return res.data.data
    })
  },

  getStats: async (options?: ApiSwrOptions) => {
    return swr('agents:stats:{}', async ({ silent }) => {
      const res = await api.get('/agents/stats', (silent || options?.silent) ? silentOverlayConfig() : undefined)
      return res.data.data
    }, options)
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
    clearSwrByPrefix('agents')
    return res.data.data
  },

  update: async (id: number, data: Record<string, unknown>) => {
    const res = await api.put(`/agents/${id}`, data)
    clearSwrByPrefix('agents')
    return res.data.data
  },

  setActive: async (id: number, isActive: boolean) => {
    const res = await api.put(`/agents/${id}`, { isActive })
    clearSwrByPrefix('agents')
    return res.data.data
  },

  finalRemove: async (id: number) => {
    const res = await api.post(`/agents/${id}/final-remove`)
    clearSwrByPrefix('agents')
    return res.data.data
  },

  updateStatus: async (id: number, status: string) => {
    const res = await api.patch(`/agents/${id}/status`, { status })
    clearSwrByPrefix('agents')
    return res.data.data
  },

  updateMyStatus: async (status: string) => {
    const res = await api.patch('/agents/me/status', { status })
    clearSwrByPrefix('agents')
    return res.data.data
  },

  delete: async (id: number) => {
    await api.delete(`/agents/${id}`)
    clearSwrByPrefix('agents')
  },
}
