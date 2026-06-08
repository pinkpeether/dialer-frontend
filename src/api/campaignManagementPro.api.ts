import api from './axios'

export type CampaignDialSettingsPayload = {
  mode?: string
  dialingRatio?: number
  maxRetries?: number
  retryDelay?: number
  startTime?: string | null
  endTime?: string | null
  timezone?: string
}

export const campaignManagementProAPI = {
  getSummary: async (campaignId: number) => {
    const res = await api.get(`/campaign-management-pro/campaigns/${campaignId}/summary`)
    return res.data.data
  },
  getScript: async (campaignId: number) => {
    const res = await api.get(`/campaign-management-pro/campaigns/${campaignId}/script`)
    return res.data.data
  },
  updateScript: async (campaignId: number, script: string) => {
    const res = await api.put(`/campaign-management-pro/campaigns/${campaignId}/script`, { script })
    return res.data.data
  },
  getScriptPopup: async (campaignId: number, payload: Record<string, unknown>) => {
    const res = await api.post(`/campaign-management-pro/campaigns/${campaignId}/script/popup`, payload)
    return res.data.data
  },
  cloneCampaign: async (campaignId: number, payload: Record<string, unknown>) => {
    const res = await api.post(`/campaign-management-pro/campaigns/${campaignId}/clone`, payload)
    return res.data.data
  },
  uploadContacts: async (campaignId: number, payload: FormData) => {
    const res = await api.post(`/campaign-management-pro/campaigns/${campaignId}/contacts/upload`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
  },
  getDialSettings: async (campaignId: number) => {
    const res = await api.get(`/campaign-management-pro/campaigns/${campaignId}/dial-settings`)
    return res.data.data
  },
  updateDialSettings: async (campaignId: number, payload: CampaignDialSettingsPayload) => {
    const res = await api.put(`/campaign-management-pro/campaigns/${campaignId}/dial-settings`, payload)
    return res.data.data
  },
  downloadReport: async (campaignId: number) => {
    const res = await api.get(`/campaign-management-pro/campaigns/${campaignId}/end-report.pdf`, {
      responseType: 'blob',
    })
    return res.data as Blob
  },
}
