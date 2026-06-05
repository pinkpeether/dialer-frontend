import api from './axios'

export type RecordingSearchParams = {
  page?: number
  limit?: number
  search?: string
  campaignId?: number
  agentId?: number
  status?: string
  source?: string
  from?: string
  to?: string
  minDuration?: number
  maxDuration?: number
  hasTranscript?: boolean
}

export type RecordingRetentionPolicy = {
  enabled: boolean
  retentionDays: number
  deleteRecordings: boolean
  deleteTranscripts: boolean
  deleteInsights: boolean
  dryRunDefault: boolean
}

export const recordingStorageProAPI = {
  getOverview: async () => {
    const res = await api.get('/recording-storage-pro/overview')
    return res.data.data
  },

  search: async (params: RecordingSearchParams) => {
    const res = await api.get('/recording-storage-pro/search', { params })
    return res.data.data
  },

  getDownloadInfo: async (callId: number) => {
    const res = await api.get(`/recording-storage-pro/calls/${callId}/download-info`)
    return res.data.data
  },

  downloadCsv: async (params: RecordingSearchParams = {}) => {
    const res = await api.get('/recording-storage-pro/export.csv', { params, responseType: 'blob' })
    return res.data as Blob
  },

  getRetentionPolicy: async () => {
    const res = await api.get('/recording-storage-pro/retention-policy')
    return res.data.data as RecordingRetentionPolicy
  },

  updateRetentionPolicy: async (payload: Partial<RecordingRetentionPolicy>) => {
    const res = await api.put('/recording-storage-pro/retention-policy', payload)
    return res.data.data as RecordingRetentionPolicy
  },

  previewPurge: async (payload: Partial<RecordingRetentionPolicy>) => {
    const res = await api.post('/recording-storage-pro/retention-policy/preview-purge', payload)
    return res.data.data
  },

  runPurge: async (payload: { dryRun?: boolean; policyOverride?: Partial<RecordingRetentionPolicy> }) => {
    const res = await api.post('/recording-storage-pro/retention-policy/run-purge', payload)
    return res.data.data
  },
}
