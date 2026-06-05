import api from './axios'

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

export const liveAiAPI = {
  listSessions: async (): Promise<LiveAiSession[]> => {
    const res = await api.get('/live-ai/sessions')
    return res.data.data
  },

  startSession: async (callId: number): Promise<LiveAiSession> => {
    const res = await api.post(`/live-ai/calls/${callId}/start`)
    return res.data.data
  },

  getSession: async (callId: number): Promise<LiveAiSession> => {
    const res = await api.get(`/live-ai/calls/${callId}/session`)
    return res.data.data
  },

  sendChunk: async (
    callId: number,
    payload: { text: string; speaker?: string; confidence?: number; source?: string },
  ): Promise<LiveAiSession> => {
    const res = await api.post(`/live-ai/calls/${callId}/chunk`, payload)
    return res.data.data
  },

  getSmartScript: async (callId: number): Promise<SmartScriptPrompt> => {
    const res = await api.get(`/live-ai/calls/${callId}/script`)
    return res.data.data
  },

  applyAutoDisposition: async (callId: number) => {
    const res = await api.post(`/live-ai/calls/${callId}/auto-disposition`)
    return res.data.data
  },

  createFollowUp: async (callId: number, payload: { minutesFromNow?: number; notes?: string }) => {
    const res = await api.post(`/live-ai/calls/${callId}/follow-up`, payload)
    return res.data.data
  },

  stopSession: async (callId: number): Promise<LiveAiSession> => {
    const res = await api.post(`/live-ai/calls/${callId}/stop`)
    return res.data.data
  },
}
