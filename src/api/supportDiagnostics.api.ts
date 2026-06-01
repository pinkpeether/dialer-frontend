import api from './axios'

export const supportDiagnosticsAPI = {
  get: async () => {
    const res = await api.get('/support/diagnostics', { timeout: 45000 })
    return res.data.data
  },

  download: async () => {
    const res = await api.get('/support/diagnostics/download', { responseType: 'blob', timeout: 45000 })
    return res.data
  },
}
