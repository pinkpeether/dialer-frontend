import api from './axios'

export const supportDiagnosticsAPI = {
  get: async () => {
    const res = await api.get('/support/diagnostics')
    return res.data.data
  },

  download: async () => {
    const res = await api.get('/support/diagnostics/download', { responseType: 'blob' })
    return res.data
  },
}
