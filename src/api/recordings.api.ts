import api from './axios'

export const recordingsAPI = {
  getAll: async (params?: Record<string, unknown>) => {
    const res = await api.get('/recordings', { params })
    return res.data.data
  },
  getByCallId: async (callId: number | string) => {
    const res = await api.get(`/recordings/${callId}`)
    return res.data.data
  },
  getAccess: async (callId: number | string) => {
    const res = await api.get(`/recordings/${callId}/access`)
    return res.data.data
  },
}
