import api from './axios'
import { silentOverlayConfig, swr, swrKey } from './swrCache'

export const recordingsAPI = {
  getAll: async (params?: Record<string, unknown>) => {
    return swr(swrKey('recordings:list', params), async ({ silent }) => {
      const config = { params }
      const res = await api.get('/recordings', silent ? silentOverlayConfig(config) : config)
      return res.data.data
    })
  },
  getHealth: async () => {
    return swr('recordings:health:{}', async ({ silent }) => {
      const res = await api.get('/recordings/health', silent ? silentOverlayConfig() : undefined)
      return res.data.data
    })
  },
  getByCallId: async (callId: number | string) => {
    return swr(swrKey('recordings:call', { callId }), async ({ silent }) => {
      const res = await api.get(`/recordings/${callId}`, silent ? silentOverlayConfig() : undefined)
      return res.data.data
    })
  },
  getAccess: async (callId: number | string) => {
    const res = await api.get(`/recordings/${callId}/access`)
    return res.data.data
  },
}
