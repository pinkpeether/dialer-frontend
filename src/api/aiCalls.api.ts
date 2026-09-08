import api from './axios'
import { silentOverlayConfig, swr, swrKey } from './swrCache'

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

export type StartAiCallInput = {
  toNumber: string
  fromNumber?: string
  transferDestination?: string
  assistantId?: string
  notes?: string
}

export type StartAiCallResponse = {
  success?: boolean
  message?: string
  callId?: number | string | null
  displayCallId?: string | null
  status?: string | null
  providerCallId?: string | null
  toNumber?: string | null
  fromNumber?: string | null
  transferDestination?: string | null
}

export const aiCallsAPI = {
  getLogs: async (params?: AiCallLogsListParams): Promise<AiCallLogsListResponse> => {
    return swr(swrKey('ai-calls:logs', params), async ({ silent }) => {
      const config = { params }
      const res = await api.get('/ai-calls/logs', silent ? silentOverlayConfig(config) : config)
      return res.data.data ?? res.data
    })
  },

  getLog: async (id: number | string): Promise<AiCallLog> => {
    return swr(swrKey('ai-calls:log', { id }), async ({ silent }) => {
      const res = await api.get(`/ai-calls/logs/${id}`, silent ? silentOverlayConfig() : undefined)
      return res.data.data ?? res.data.item ?? res.data
    })
  },

  startOutboundCall: async (payload: StartAiCallInput): Promise<StartAiCallResponse> => {
    const res = await api.post('/ai-calls/outbound', payload)
    return res.data.data ?? res.data
  },

  hangupOutboundCall: async (id: number | string, providerCallId?: string | null): Promise<StartAiCallResponse> => {
    const cleanProviderCallId = String(providerCallId || '').trim()
    const encodedProviderCallId = cleanProviderCallId.startsWith('call_') ? encodeURIComponent(cleanProviderCallId) : ''
    const path = encodedProviderCallId
      ? `/ai-calls/provider-calls/${encodedProviderCallId}/hangup`
      : `/ai-calls/logs/${id}/hangup`
    const res = await api.post(path)
    return res.data.data ?? res.data
  },
}
