import api from './axios'

export const monitoringAPI = {
  summary: async () => {
    const res = await api.get('/monitoring/summary')
    return res.data.data
  },

  resetRuntime: async () => {
    const res = await api.post('/monitoring/runtime/reset')
    return res.data.data
  },
}
