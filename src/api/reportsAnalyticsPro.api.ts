import api from './axios'

export type ReportsAnalyticsFilters = {
  from?: string
  to?: string
  campaignId?: number | string
  agentId?: number | string
  period?: string
}

function toBlobUrl(blob: Blob) {
  const url = URL.createObjectURL(blob)
  return {
    url,
    revoke: () => URL.revokeObjectURL(url),
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const { url, revoke } = toBlobUrl(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.setTimeout(revoke, 2000)
}

const cleanParams = (filters: ReportsAnalyticsFilters = {}) => {
  const params: Record<string, string | number> = {}
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params[key] = value as string | number
    }
  })
  return params
}

export const reportsAnalyticsProAPI = {
  overview: async (filters?: ReportsAnalyticsFilters) => {
    const res = await api.get('/reports-analytics-pro/overview', { params: cleanParams(filters) })
    return res.data.data
  },

  agentPerformance: async (filters?: ReportsAnalyticsFilters) => {
    const res = await api.get('/reports-analytics-pro/agents/performance', { params: cleanParams(filters) })
    return res.data.data
  },

  hourly: async (filters?: ReportsAnalyticsFilters) => {
    const res = await api.get('/reports-analytics-pro/hourly', { params: cleanParams(filters) })
    return res.data.data
  },

  conversions: async (filters?: ReportsAnalyticsFilters) => {
    const res = await api.get('/reports-analytics-pro/conversions', { params: cleanParams(filters) })
    return res.data.data
  },

  duration: async (filters?: ReportsAnalyticsFilters) => {
    const res = await api.get('/reports-analytics-pro/duration', { params: cleanParams(filters) })
    return res.data.data
  },

  missedCalls: async (filters?: ReportsAnalyticsFilters) => {
    const res = await api.get('/reports-analytics-pro/missed-calls', { params: cleanParams(filters) })
    return res.data.data
  },

  dailySummaryPreview: async (filters?: ReportsAnalyticsFilters) => {
    const res = await api.get('/reports-analytics-pro/daily-summary-email/preview', { params: cleanParams(filters) })
    return res.data.data
  },

  sendDailySummary: async (filters?: ReportsAnalyticsFilters) => {
    const res = await api.post('/reports-analytics-pro/daily-summary-email/send', null, { params: cleanParams(filters) })
    return res.data.data
  },

  downloadCampaignPdf: async (campaignId: string | number, filters?: ReportsAnalyticsFilters) => {
    const res = await api.get(`/reports-analytics-pro/campaigns/${campaignId}/pdf`, {
      params: cleanParams(filters),
      responseType: 'blob',
    })
    const filenameHeader = String(res.headers['content-disposition'] || '')
    const matched = filenameHeader.match(/filename="?([^"]+)"?/)
    const filename = matched?.[1] || `ptdt-campaign-${campaignId}-report.pdf`
    downloadBlob(res.data, filename)
    return filename
  },

  downloadCsvSummary: async (filters?: ReportsAnalyticsFilters) => {
    const res = await api.get('/reports-analytics-pro/export/csv', {
      params: cleanParams(filters),
      responseType: 'blob',
    })
    downloadBlob(res.data, 'ptdt-reports-summary.csv')
  },

  campaignPdfUrl: (campaignId: string | number, filters?: ReportsAnalyticsFilters) => {
    const params = new URLSearchParams()
    Object.entries(cleanParams(filters)).forEach(([key, value]) => params.set(key, String(value)))
    const query = params.toString()
    return `/reports-analytics-pro/campaigns/${campaignId}/pdf${query ? `?${query}` : ''}`
  },

  csvUrl: (filters?: ReportsAnalyticsFilters) => {
    const params = new URLSearchParams()
    Object.entries(cleanParams(filters)).forEach(([key, value]) => params.set(key, String(value)))
    const query = params.toString()
    return `/reports-analytics-pro/export/csv${query ? `?${query}` : ''}`
  },
}
