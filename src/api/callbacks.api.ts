import api from './axios'

export type CallbackStatus = 'PENDING' | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED'

export type CallbackCommercialAccount = {
  id: number | null
  name: string
  code: string
  status: string
}

export type CallbackRecord = {
  id: number | string
  contactId?: number | null
  callId?: number | string | null
  scheduledAt: string
  notes?: string | null
  status: CallbackStatus
  contactName?: string | null
  contactPhone?: string | null
  agentName?: string | null
  createdAt?: string
  commercialAccount?: CallbackCommercialAccount | null
  commercialAccounts?: CallbackCommercialAccount[]
}

const stringValue = (value: unknown, fallback = '') => {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return fallback
}

const accountFrom = (value: unknown): CallbackCommercialAccount | null => {
  const account = value as Record<string, unknown> | null | undefined
  if (!account || (!account.id && !account.name)) return null
  return {
    id: account.id ? Number(account.id) : null,
    name: stringValue(account.name, 'PTDT Super Admin'),
    code: stringValue(account.code, '—'),
    status: stringValue(account.status, '—'),
  }
}

const normalizeCallback = (raw: unknown): CallbackRecord => {
  const item = raw as Record<string, unknown>
  const contact = item.contact as Record<string, unknown> | undefined
  const call = item.call as Record<string, unknown> | undefined
  const campaign = item.campaign as Record<string, unknown> | undefined
  const contactCampaign = contact?.campaign as Record<string, unknown> | undefined
  const callCampaign = call?.campaign as Record<string, unknown> | undefined
  const agent = item.agent as Record<string, unknown> | undefined
  const accounts = Array.isArray(item.commercialAccounts)
    ? item.commercialAccounts.map(accountFrom).filter(Boolean) as CallbackCommercialAccount[]
    : []
  const commercialAccount = accountFrom(item.commercialAccount)
    || accountFrom(campaign?.commercialAccount)
    || accountFrom(callCampaign?.commercialAccount)
    || accountFrom(contactCampaign?.commercialAccount)
    || accounts[0]
    || null

  return {
    ...(item as unknown as CallbackRecord),
    contactId: (item.contactId as number | null | undefined) ?? (contact?.id as number | null | undefined),
    contactName: (item.contactName as string | null | undefined) ?? (contact?.name as string | null | undefined),
    contactPhone: (item.contactPhone as string | null | undefined) ?? (contact?.phone as string | null | undefined),
    agentName: (item.agentName as string | null | undefined) ?? (agent?.name as string | null | undefined),
    commercialAccount,
    commercialAccounts: commercialAccount ? [commercialAccount, ...accounts.filter(account => account.id !== commercialAccount.id)] : accounts,
  }
}

export const callbacksAPI = {
  getAll: async (params?: {
    status?: CallbackStatus
    from?: string
    to?: string
    page?: number
    limit?: number
  }): Promise<CallbackRecord[]> => {
    const res = await api.get('/callbacks', { params })
    const data = res.data?.data ?? res.data
    if (Array.isArray(data)) return data.map(normalizeCallback)
    if (Array.isArray(data?.callbacks)) return data.callbacks.map(normalizeCallback)
    if (Array.isArray(data?.items)) return data.items.map(normalizeCallback)
    return []
  },

  create: async (data: {
    contactId?: number
    callId?: number | string
    scheduledAt: string
    notes?: string
  }): Promise<CallbackRecord> => {
    const res = await api.post('/callbacks', data)
    return normalizeCallback(res.data?.data ?? res.data)
  },

  updateStatus: async (
    id: number | string,
    status: CallbackStatus,
    notes?: string
  ): Promise<void> => {
    await api.patch(`/callbacks/${id}`, { status, notes })
  },

  reschedule: async (
    id: number | string,
    scheduledAt: string,
    notes?: string
  ): Promise<void> => {
    await api.patch(`/callbacks/${id}`, {
      status: 'RESCHEDULED',
      scheduledAt,
      notes,
    })
  },
}
