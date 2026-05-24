import api from './axios'

const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

export const exportsAPI = {
  callsCsv: async (params?: Record<string, unknown>) => {
    const res = await api.get('/exports/calls.csv', { params, responseType: 'blob' })
    downloadBlob(res.data, 'ptdt-calls.csv')
  },
  contactsCsv: async (params?: Record<string, unknown>) => {
    const res = await api.get('/exports/contacts.csv', { params, responseType: 'blob' })
    downloadBlob(res.data, 'ptdt-contacts.csv')
  },
  campaignCsv: async (campaignId: number | string) => {
    const res = await api.get(`/exports/campaigns/${campaignId}.csv`, { responseType: 'blob' })
    downloadBlob(res.data, `ptdt-campaign-${campaignId}.csv`)
  },
}
