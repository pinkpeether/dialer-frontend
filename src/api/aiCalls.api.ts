import api from './axios'

export type AiCallLog = {
  id: number | string
  provider?: string | null
  providerCallId?: string | null
  lastEvent?: string | null
  callStatus?: string | null
  callType?: string | null
  direction?: string | null
  fromNumber?: string | null
  toNumber?: string | null
  agentId?: string | null
  agentName?: string | null
  durationMs?: number | null
  disconnectionReason?: string | null
  transferDestination?: string | null
  transcriptText?: string | null
  transcriptLength?: number | null
  recordingUrl?: string | null
  hasRecordingUrl?: boolean | null
  callSummary?: string | null
  userSentiment?: string | null
  callSuccessful?: boolean | null
  inVoicemail?: boolean | null
  callAnalysis?: unknown
  lastWebhookAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export type AiCallLogsPagination = {
  page?: number
  limit?: number
  total?: number
  totalPages?: number
  hasNextPage?: boolean
  hasPreviousPage?: boolean
}

export type AiCallLogsListParams = {
  page?: number
  limit?: number
  search?: string
}

export type AiCallLogsListResponse = {
  items?: AiCallLog[]
  pagination?: AiCallLogsPagination
  rawIncluded?: boolean
}

export const aiCallsAPI = {
  getLogs: async (params?: AiCallLogsListParams): Promise<AiCallLogsListResponse> => {
    const res = await api.get('/ai-calls/logs', { params })
    return res.data.data ?? res.data
  },

  getLog: async (id: number | string): Promise<AiCallLog> => {
    const res = await api.get(`/ai-calls/logs/${id}`)
    return res.data.data ?? res.data
  },
}
