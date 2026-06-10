import api from './axios'

export type CommercialPlanCode = 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ELITE' | 'ENTERPRISE'
export type CommercialAddonCode = 'DYNAMIC_CALLER_ID' | 'SMS' | 'AI_TRANSCRIPTS' | 'AI_INSIGHTS' | 'RECORDINGS' | 'ADVANCED_ANALYTICS' | 'CRM_CONNECTORS'
export type CommercialStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'TRIAL' | 'PENDING_APPROVAL'
export type PaymentRequestStatus = 'PENDING_PAYMENT' | 'PAYMENT_SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export type CommercialAccount = {
  id: number
  name: string
  code: string
  status: string
  email?: string | null
  phone?: string | null
  currency: string
  lowBalanceThreshold: string | number
  criticalBalanceThreshold: string | number
  hardStopEnabled: boolean
  createdAt: string
  updatedAt: string
}

export type CommercialWallet = {
  id: number
  accountId: number
  currency: string
  availableBalance: string | number
  heldBalance: string | number
  creditLimit: string | number
}

export type CommercialPlan = {
  id: number
  code: CommercialPlanCode
  name: string
  monthlyFee: string | number
  includedSeats: number
  description?: string | null
  features?: Record<string, unknown> | null
  isActive: boolean
}

export type CommercialAddon = {
  id: number
  code: CommercialAddonCode
  name: string
  monthlyFee: string | number
  description?: string | null
  isActive: boolean
}

export type CommercialAddonStatus = {
  addon: CommercialAddon
  status: CommercialStatus
  startsAt?: string | null
  endsAt?: string | null
  priceOverride?: string | number | null
  notes?: string | null
}

export type CommercialSubscription = {
  id: number
  accountId: number
  planId: number
  status: CommercialStatus
  startsAt: string
  endsAt?: string | null
  monthlyFeeOverride?: string | number | null
  plan: CommercialPlan
}

export type BillingAlert = {
  id: number
  accountId: number
  severity: 'INFO' | 'LOW_BALANCE' | 'CRITICAL_BALANCE' | 'HARD_STOP'
  title: string
  body?: string | null
  balanceAt?: string | number | null
  thresholdValue?: string | number | null
  isRead: boolean
  createdAt: string
}

export type WalletTransaction = {
  id: number
  type: string
  direction: string
  amount: string | number
  balanceAfter: string | number
  referenceType?: string | null
  referenceId?: string | null
  description?: string | null
  createdAt: string
}

export type PaymentRequest = {
  id: number
  accountId: number
  amount: string | number
  currency: string
  requestedAddons?: CommercialAddonCode[] | null
  paymentMethod?: string | null
  paymentReference?: string | null
  proofUrl?: string | null
  notes?: string | null
  status: PaymentRequestStatus
  reviewedAt?: string | null
  createdAt: string
  account?: Pick<CommercialAccount, 'id' | 'name' | 'code' | 'currency'>
  requestedPlan?: CommercialPlan | null
}

export type CommercialSummary = {
  account: CommercialAccount
  wallet: CommercialWallet | null
  balanceState: 'HEALTHY' | 'LOW_BALANCE' | 'CRITICAL_BALANCE' | 'HARD_STOP'
  subscription: CommercialSubscription | null
  addons: CommercialAddonStatus[]
  alerts: BillingAlert[]
  latestTransactions: WalletTransaction[]
  callerIdControl: {
    dynamicCallerIdEnabled: boolean
    verifiedCallerIds: number
    activeVerifiedCallerIds: number
    availableNumbers: Array<{ id: number; displayNumber: string; displayName?: string | null; scope: string; provider?: string | null }>
  }
}

export type CommercialCatalog = {
  plans: CommercialPlan[]
  addons: CommercialAddon[]
}

export const commercialControlApi = {
  seedCatalog: async () => {
    const res = await api.post('/commercial-control/admin/seed-catalog')
    return res.data.data as CommercialSummary
  },
  getCatalog: async () => {
    const res = await api.get('/commercial-control/catalog')
    return res.data.data as CommercialCatalog
  },
  getSummary: async (accountId?: number) => {
    const res = await api.get('/commercial-control/summary', { params: accountId ? { accountId } : undefined })
    return res.data.data as CommercialSummary
  },
  listAccounts: async () => {
    const res = await api.get('/commercial-control/admin/accounts')
    return res.data.data as CommercialAccount[]
  },
  createAccount: async (payload: { name: string; code?: string; email?: string; phone?: string; currency?: string; lowBalanceThreshold?: string; criticalBalanceThreshold?: string }) => {
    const res = await api.post('/commercial-control/admin/accounts', payload)
    return res.data.data as CommercialAccount
  },
  listPaymentRequests: async (accountId?: number) => {
    const res = await api.get('/commercial-control/admin/payment-requests', { params: accountId ? { accountId } : undefined })
    return res.data.data as PaymentRequest[]
  },
  createPaymentRequest: async (payload: { accountId: number; amount: string; currency?: string; requestedPlanCode?: CommercialPlanCode | ''; requestedAddonCodes?: CommercialAddonCode[]; paymentMethod?: string; paymentReference?: string; proofUrl?: string; notes?: string }) => {
    const res = await api.post('/commercial-control/admin/payment-requests', {
      ...payload,
      requestedPlanCode: payload.requestedPlanCode || null,
    })
    return res.data.data as PaymentRequest
  },
  updatePaymentRequestStatus: async (id: number, status: PaymentRequestStatus) => {
    const res = await api.patch(`/commercial-control/admin/payment-requests/${id}/status`, { status })
    return res.data.data as PaymentRequest
  },
  activatePlan: async (accountId: number, payload: { planCode: CommercialPlanCode; status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TRIAL'; monthlyFeeOverride?: string; endsAt?: string; notes?: string }) => {
    const res = await api.post(`/commercial-control/admin/accounts/${accountId}/activate-plan`, payload)
    return res.data.data as CommercialSubscription
  },
  topUpWallet: async (accountId: number, payload: { amount: string; description?: string; reference?: string }) => {
    const res = await api.post(`/commercial-control/admin/accounts/${accountId}/topup`, payload)
    return res.data.data as { wallet: CommercialWallet; transaction: WalletTransaction }
  },
  setAddonStatus: async (accountId: number, addonCode: CommercialAddonCode, payload: { status: CommercialStatus; priceOverride?: string; notes?: string }) => {
    const res = await api.patch(`/commercial-control/admin/accounts/${accountId}/addons/${addonCode}`, payload)
    return res.data.data
  },
  updateThresholds: async (accountId: number, payload: { lowBalanceThreshold?: string; criticalBalanceThreshold?: string; hardStopEnabled?: boolean }) => {
    const res = await api.patch(`/commercial-control/admin/accounts/${accountId}/thresholds`, payload)
    return res.data.data as CommercialAccount
  },
}
