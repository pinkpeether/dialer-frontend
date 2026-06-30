import api from './axios'

const selectedDynamicCallerId = (explicit?: number | string | null) => {
  if (explicit) return Number(explicit)
  if (typeof window === 'undefined') return undefined
  const stored = window.localStorage.getItem('ptdt-dialer:selected-dynamic-caller-id')
  return stored ? Number(stored) : undefined
}

const campaignControlPermissionMessage =
  'Campaign control is managed by your Supervisor. Select an active campaign and register your voice account to start calling.'

function isForbiddenError(err: unknown) {
  return Boolean(
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    (err as { response?: { status?: number } }).response?.status === 403,
  )
}

async function campaignControlRequest(request: () => Promise<unknown>) {
  try {
    return await request()
  } catch (err) {
    if (isForbiddenError(err)) {
      throw new Error(campaignControlPermissionMessage)
    }
    throw err
  }
}

export const dialerAPI = {
  getToken: async () => {
    const res = await api.get('/dialer/token')
    return res.data.data.token
  },

  startCampaign: async (campaignId: number) => {
    return campaignControlRequest(async () => {
      const res = await api.post('/dialer/start/' + campaignId)
      return res.data
    })
  },

  stopCampaign: async (campaignId: number) => {
    return campaignControlRequest(async () => {
      const res = await api.post('/dialer/stop/' + campaignId)
      return res.data
    })
  },

  getActiveCampaigns: async () => {
    const res = await api.get('/dialer/active')
    return res.data.data
  },

  makeManualCall: async (contactId: number, campaignId: number, callerIdId?: number | string | null) => {
    const res = await api.post('/dialer/call/manual', { contactId, campaignId, callerIdId: selectedDynamicCallerId(callerIdId) })
    return res.data.data
  },

  makeAdhocCall: async (phone: string, note?: string, callerIdId?: number | string | null) => {
    const res = await api.post('/dialer/call/adhoc', { phone, note, callerIdId: selectedDynamicCallerId(callerIdId) })
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
