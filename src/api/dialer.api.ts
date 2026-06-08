import api from './axios'

export const dialerAPI = {
  getToken: async () => {
    const res = await api.get('/dialer/token')
    return res.data.data.token
  },

  startCampaign: async (campaignId: number) => {
    const res = await api.post(`/dialer/start/${campaignId}`)
    return res.data
  },

  stopCampaign: async (campaignId: number) => {
    const res = await api.post(`/dialer/stop/${campaignId}`)
    return res.data
  },

  getActiveCampaigns: async () => {
    const res = await api.get('/dialer/active')
    return res.data.data
  },

  makeManualCall: async (contactId: number, campaignId: number) => {
    const res = await api.post('/dialer/call/manual', { contactId, campaignId })
    return res.data.data
  },

  makeAdhocCall: async (phone: string, note?: string) => {
    const res = await api.post('/dialer/call/adhoc', { phone, note })
    return res.data.data
  },

  sendDTMF: async (callSid: string, digits: string) => {
    const res = await api.post('/dialer/call/dtmf', { providerCallId: callSid, digits })
    return res.data
  },

  hangupCall: async (callSid: string) => {
    const res = await api.post('/dialer/call/hangup', { providerCallId: callSid })
    return res.data
  },
}
