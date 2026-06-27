import api from './axios'
import { silentOverlayConfig, swr, swrKey } from './swrCache'

export type ReportFilters = {
  from?: string
  to?: string
  campaignId?: number
  agentId?: number
  granularity?: 'day' | 'week'
}

export type ReportSummary = {
  totalCalls: number
  answered: number
  noAnswer: number
  voicemail: number
  callback: number
  dnc: number
  wrongNumber: number
  failed: number
  totalTalkTimeSecs: number
  answerRate: number
}

export type ReportTrendRow = {
  date: string
  total: number
  answered: number
}

export type CampaignReportRow = {
  id: number
  name: string
  status: string
  totalContacts: number
  totalCalls: number
  answered: number
  answerRate: number
  totalTalkTimeSecs: number
}

export type AgentReportRow = {
  id: number
  agentCode: string
  name: string
  status: string
  totalCalls: number
  answered: number
  answerRate: number
  totalTalkTimeSecs: number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const dataOf = <T>(response: { data: unknown }): T => {
  const payload = response.data
  if (isRecord(payload) && 'data' in payload) return payload.data as T
  return payload as T
}

export const reportsAPI = {
  getSummary: async (filters?: ReportFilters): Promise<ReportSummary> => {
    return swr(swrKey('reports:summary', filters), async ({ silent }) => {
      const config = { params: filters }
      const res = await api.get('/reports/summary', silent ? silentOverlayConfig(config) : config)
      return dataOf<ReportSummary>(res)
    })
  },

  getCallTrend: async (filters?: ReportFilters): Promise<ReportTrendRow[]> => {
    const params = { from: filters?.from, to: filters?.to, granularity: filters?.granularity ?? 'day' }
    return swr(swrKey('reports:calls', params), async ({ silent }) => {
      const res = await api.get('/reports/calls', silent ? silentOverlayConfig({ params }) : { params })
      return dataOf<ReportTrendRow[]>(res)
    })
  },

  getCampaignBreakdown: async (filters?: ReportFilters): Promise<CampaignReportRow[]> => {
    const params = { from: filters?.from, to: filters?.to }
    return swr(swrKey('reports:campaigns', params), async ({ silent }) => {
      const res = await api.get('/reports/campaigns', silent ? silentOverlayConfig({ params }) : { params })
      return dataOf<CampaignReportRow[]>(res)
    })
  },

  getAgentBreakdown: async (filters?: ReportFilters): Promise<AgentReportRow[]> => {
    const params = { from: filters?.from, to: filters?.to }
    return swr(swrKey('reports:agents', params), async ({ silent }) => {
      const res = await api.get('/reports/agents', silent ? silentOverlayConfig({ params }) : { params })
      return dataOf<AgentReportRow[]>(res)
    })
  },
}
