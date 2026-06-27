import api from './axios'
import { clearSwrByPrefix, silentOverlayConfig, swr, swrKey } from './swrCache'

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
    return swr('recording-storage-pro:overview:{}', async ({ silent }) => {
      const res = await api.get('/recording-storage-pro/overview', silent ? silentOverlayConfig() : undefined)
      return res.data.data
    })
  },

  search: async (params: RecordingSearchParams) => {
    return swr(swrKey('recording-storage-pro:search', params), async ({ silent }) => {
      const config = { params }
      const res = await api.get('/recording-storage-pro/search', silent ? silentOverlayConfig(config) : config)
      return res.data.data
    })
  },

  getDownloadInfo: async (callId: number) => {
    return swr(swrKey('recording-storage-pro:download-info', { callId }), async ({ silent }) => {
      const res = await api.get(`/recording-storage-pro/calls/${callId}/download-info`, silent ? silentOverlayConfig() : undefined)
      return res.data.data
    })
  },

  downloadCsv: async (params: RecordingSearchParams = {}) => {
    const res = await api.get('/recording-storage-pro/export.csv', { params, responseType: 'blob' })
    return res.data as Blob
  },

  getRetentionPolicy: async () => {
    return swr('recording-storage-pro:retention-policy:{}', async ({ silent }) => {
      const res = await api.get('/recording-storage-pro/retention-policy', silent ? silentOverlayConfig() : undefined)
      return res.data.data as RecordingRetentionPolicy
    })
  },

  updateRetentionPolicy: async (payload: Partial<RecordingRetentionPolicy>) => {
    const res = await api.put('/recording-storage-pro/retention-policy', payload)
    clearSwrByPrefix('recording-storage-pro')
    return res.data.data as RecordingRetentionPolicy
  },

  previewPurge: async (payload: Partial<RecordingRetentionPolicy>) => {
    const res = await api.post('/recording-storage-pro/retention-policy/preview-purge', payload)
    return res.data.data
  },

  runPurge: async (payload: { dryRun?: boolean; policyOverride?: Partial<RecordingRetentionPolicy> }) => {
    const res = await api.post('/recording-storage-pro/retention-policy/run-purge', payload)
    clearSwrByPrefix('recording-storage-pro')
    return res.data.data
  },
}
