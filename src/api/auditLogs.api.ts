import api from './axios'

export const auditLogsAPI = {
  getAll: async (params?: Record<string, unknown>) => {
    const res = await api.get('/audit-logs', { params })
    return res.data.data
  },
  getById: async (id: number | string) => {
    const res = await api.get(`/audit-logs/${id}`)
    return res.data.data
  },
}
