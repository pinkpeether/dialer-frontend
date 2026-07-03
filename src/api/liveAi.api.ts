import api from './axios'
import { clearSwrByPrefix, silentOverlayConfig, swr, swrKey } from './swrCache'

export type LiveAiSentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'CRITICAL'
export type AnswerDetection = 'UNKNOWN' | 'HUMAN' | 'VOICEMAIL' | 'NOISE_OR_SILENCE'

export type LiveAiSession = {
  callId: number
  campaignId?: number | null
  contactId?: number | null
  agentId?: number | null
  startedAt: string
  updatedAt: string
  stoppedAt?: string | null
  status: 'LIVE' | 'STOPPED'
  answerDetection: AnswerDetection
  sentiment: LiveAiSentiment
  sentimentScore: number
  transcriptText: string
  chunks: Array<{
    id: string
    speaker: string
    text: string
    confidence?: number
    source?: string
    sentiment: LiveAiSentiment
    sentimentScore: number
    createdAt: string
  }>
  alerts: Array<{
    id: string
    type: string
    severity: 'INFO' | 'WARNING' | 'CRITICAL'
    message: string
    createdAt: string
  }>
  scriptPrompt?: string | null
  recommendedResponse?: string | null
  autoDisposition?: string | null
  followUpSuggestion?: {
    shouldSchedule: boolean
    suggestedMinutesFromNow: number
    reason: string
  } | null
}

export type SmartScriptPrompt = {
  callId: number
  campaignId?: number | null
  contactId?: number | null
  contactName: string
  campaignName?: string | null
  baseScript: string
  liveHint: string
  objectionHandling: string[]
}

type LiveAiOptions = { silent?: boolean }

const liveAiGetConfig = (silent: boolean, config = {}) => (
  silent ? silentOverlayConfig(config) : config
)

export const liveAiAPI = {
  listSessions: async (options?: LiveAiOptions): Promise<LiveAiSession[]> => swr(
    swrKey('live-ai', { type: 'sessions' }),
    async ({ silent }) => {
      const res = await api.get('/live-ai/sessions', liveAiGetConfig(silent))
      return res.data.data
    },
    options,
  ),

  startSession: async (callId: number): Promise<LiveAiSession> => {
    const res = await api.post(`/live-ai/calls/${callId}/start`)
    clearSwrByPrefix('live-ai')
    return res.data.data
  },

  getSession: async (callId: number, options?: LiveAiOptions): Promise<LiveAiSession> => swr(
    swrKey('live-ai', { type: 'session', callId }),
    async ({ silent }) => {
      const res = await api.get(`/live-ai/calls/${callId}/session`, liveAiGetConfig(silent))
      return res.data.data
    },
    options,
  ),

  sendChunk: async (
    callId: number,
    payload: { text: string; speaker?: string; confidence?: number; source?: string },
  ): Promise<LiveAiSession> => {
    const res = await api.post(`/live-ai/calls/${callId}/chunk`, payload)
    clearSwrByPrefix('live-ai')
    return res.data.data
  },

  getSmartScript: async (callId: number, options?: LiveAiOptions): Promise<SmartScriptPrompt> => swr(
    swrKey('live-ai', { type: 'smart-script', callId }),
    async ({ silent }) => {
      const res = await api.get(`/live-ai/calls/${callId}/script`, liveAiGetConfig(silent))
      return res.data.data
    },
    options,
  ),

  applyAutoDisposition: async (callId: number) => {
    const res = await api.post(`/live-ai/calls/${callId}/auto-disposition`)
    clearSwrByPrefix('live-ai')
    return res.data.data
  },

  createFollowUp: async (callId: number, payload: { minutesFromNow?: number; notes?: string }) => {
    const res = await api.post(`/live-ai/calls/${callId}/follow-up`, payload)
    clearSwrByPrefix('live-ai')
    return res.data.data
  },

  stopSession: async (callId: number): Promise<LiveAiSession> => {
    const res = await api.post(`/live-ai/calls/${callId}/stop`)
    clearSwrByPrefix('live-ai')
    return res.data.data
  },
}
