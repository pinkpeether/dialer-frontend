import api from './axios'

export type DynamicCallerIdStatus = 'PENDING' | 'VERIFIED' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'REJECTED'

export type DynamicCallerIdRecord = {
  id: number
  displayNumber: string
  displayName?: string | null
  provider?: string | null
  isActive: boolean
  isVerified: boolean
  scope: string
  approvalStatus: DynamicCallerIdStatus
  commercialAccountId?: number | null
  requestedByUserId?: number | null
  approvedByUserId?: number | null
  isUsable: boolean
  createdAt: string
  updatedAt: string
  user?: { id: number; name: string; email: string } | null
}

export type DynamicCallerIdSummary = {
  account: { id: number; name: string; code: string; status: string; currency: string }
  addonActive: boolean
  membership: { accountRole: string; canUseDynamicCallerId: boolean; canRequestCallerIds: boolean }
  balanceState: string
  callerIds: DynamicCallerIdRecord[]
  availableNumbers: DynamicCallerIdRecord[]
}

export type RequestCallerIdPayload = {
  accountId?: number | string | null
  displayNumber: string
  displayName?: string | null
  provider?: string | null
  notes?: string | null
}

export type DynamicCallerIdCallValidation = {
  allowed: boolean
  callerId: string | null
  dynamicCallerIdUsed: boolean
}

export const dynamicCallerIdApi = {
  getSummary: async (accountId?: number | string | null) => {
    const res = await api.get('/dynamic-caller-id/summary', { params: accountId ? { accountId } : undefined })
    return res.data.data as DynamicCallerIdSummary
  },
  list: async (accountId?: number | string | null) => {
    const res = await api.get('/dynamic-caller-id', { params: accountId ? { accountId } : undefined })
    return res.data.data as DynamicCallerIdRecord[]
  },
  validateCall: async (callerIdId?: number | string | null) => {
    const res = await api.post('/dynamic-caller-id/validate-call', { callerIdId: callerIdId || null })
    return res.data.data as DynamicCallerIdCallValidation
  },
  request: async (payload: RequestCallerIdPayload) => {
    const res = await api.post('/dynamic-caller-id/request', payload)
    return res.data.data as DynamicCallerIdRecord
  },
  adminCreate: async (payload: RequestCallerIdPayload & { accountId: number | string; status?: DynamicCallerIdStatus }) => {
    const res = await api.post('/dynamic-caller-id/admin', payload)
    return res.data.data as DynamicCallerIdRecord
  },
  setStatus: async (id: number, status: DynamicCallerIdStatus) => {
    const res = await api.patch('/dynamic-caller-id/' + id + '/status', { status })
    return res.data.data as DynamicCallerIdRecord
  },
}
