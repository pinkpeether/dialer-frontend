import api from './axios'

export type SmsConfig = {
  enabled: boolean
  provider: string
  defaultFrom: string
  maxMessageLength: number
  defaultCountryCode: string
  statusLookupEnabled: boolean
}

export type SmsSendPayload = {
  from: string
  to: string | string[]
  message: string
}

export type SmsSendResult = {
  provider: string
  request: {
    from: string
    to: string[]
    messageLength: number
  }
  providerStatus: string
  queuedMessageIds: string[]
  totalCost: number | null
  raw: Record<string, unknown>
}

export type SmsStatusResult = {
  provider: string
  messageId: string
  providerStatus: string
  smsStatus: string
  from: string
  to: string
  createdDate: string
  providerData: Record<string, unknown>
  raw: Record<string, unknown>
}

export const smsApi = {
  async getConfig() {
    const res = await api.get('/sms/config')
    return res.data.data as SmsConfig
  },

  async send(payload: SmsSendPayload) {
    const res = await api.post('/sms/send', payload)
    return res.data.data as SmsSendResult
  },

  async getStatus(messageId: string) {
    const res = await api.get(`/sms/status/${encodeURIComponent(messageId)}`)
    return res.data.data as SmsStatusResult
  },
}
