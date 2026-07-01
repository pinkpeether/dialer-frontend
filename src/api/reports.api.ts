import api from './axios'
import { silentOverlayConfig, swr, swrKey } from './swrCache'

export type ReportFilters = {
  from?: string
  to?: string
  campaignId?: number
  agentId?: number
  commercialAccountId?: number
  granularity?: 'day' | 'week'
}

export type ReportSummary = { totalCalls: number; answered: number; noAnswer: number; voicemail: number; callback: number; dnc: number; wrongNumber: number; failed: number; totalTalkTimeSecs: number; answerRate: number }
export type ReportTrendRow = { date: string; total: number; answered: number }
export type ReportCommercialAccount = { id: number | null; name: string; code: string; status: string }
export type CampaignReportRow = { id: number; name: string; status: string; commercialAccountId?: number | null; commercialAccount?: ReportCommercialAccount | null; totalContacts: number; totalCalls: number; answered: number; answerRate: number; totalTalkTimeSecs: number }
export type AgentReportRow = { id: number; agentCode: string; name: string; status: string; commercialAccount?: ReportCommercialAccount | null; commercialAccounts?: ReportCommercialAccount[]; totalCalls: number; answered: number; answerRate: number; totalTalkTimeSecs: number }

type ApiSwrOptions = { silent?: boolean }
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const dataOf = <T>(response: { data: unknown }): T => { const payload = response.data; if (isRecord(payload) && 'data' in payload) return payload.data as T; return payload as T }
const baseParams = (filters?: ReportFilters) => ({ from: filters?.from, to: filters?.to, commercialAccountId: filters?.commercialAccountId })

export const reportsAPI = {
  getSummary: async (filters?: ReportFilters): Promise<ReportSummary> => swr(swrKey('reports:summary', filters), async ({ silent }) => { const config = { params: filters }; const res = await api.get('/reports/summary', silent ? silentOverlayConfig(config) : config); return dataOf<ReportSummary>(res) }),
  getCallTrend: async (filters?: ReportFilters, options?: ApiSwrOptions): Promise<ReportTrendRow[]> => { const params = { ...baseParams(filters), granularity: filters?.granularity ?? 'day' }; return swr(swrKey('reports:calls', params), async ({ silent }) => { const res = await api.get('/reports/calls', (silent || options?.silent) ? silentOverlayConfig({ params }) : { params }); return dataOf<ReportTrendRow[]>(res) }, options) },
  getCampaignBreakdown: async (filters?: ReportFilters): Promise<CampaignReportRow[]> => { const params = baseParams(filters); return swr(swrKey('reports:campaigns', params), async ({ silent }) => { const res = await api.get('/reports/campaigns', silent ? silentOverlayConfig({ params }) : { params }); return dataOf<CampaignReportRow[]>(res) }) },
  getAgentBreakdown: async (filters?: ReportFilters): Promise<AgentReportRow[]> => { const params = baseParams(filters); return swr(swrKey('reports:agents', params), async ({ silent }) => { const res = await api.get('/reports/agents', silent ? silentOverlayConfig({ params }) : { params }); return dataOf<AgentReportRow[]>(res) }) },
}
