import api from './axios'
import { silentOverlayConfig } from './swrCache'

export type CommercialPlanCode = 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ELITE' | 'ENTERPRISE'
export type CommercialAddonCode = 'DYNAMIC_CALLER_ID' | 'SMS' | 'AI_TRANSCRIPTS' | 'AI_INSIGHTS' | 'RECORDINGS' | 'ADVANCED_ANALYTICS' | 'CRM_CONNECTORS'
export type CommercialStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'TRIAL' | 'PENDING_APPROVAL'
export type PaymentRequestStatus = 'PENDING_PAYMENT' | 'PAYMENT_SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export type CommercialAccount = { id: number; name: string; code: string; status: string; email?: string | null; phone?: string | null; currency: string; lowBalanceThreshold: string | number; criticalBalanceThreshold: string | number; hardStopEnabled: boolean; createdAt: string; updatedAt: string }
export type CommercialWallet = { id: number; accountId: number; currency: string; availableBalance: string | number; heldBalance: string | number; creditLimit: string | number }
export type CommercialPlan = { id: number; code: CommercialPlanCode; name: string; monthlyFee: string | number; includedSeats: number; description?: string | null; features?: Record<string, unknown> | null; isActive: boolean }
export type CommercialAddon = { id: number; code: CommercialAddonCode; name: string; monthlyFee: string | number; description?: string | null; isActive: boolean }
export type CommercialAddonStatus = { id?: number; addon: CommercialAddon; status: CommercialStatus; startsAt?: string | null; endsAt?: string | null; priceOverride?: string | number | null; notes?: string | null }
export type CommercialSubscription = { id: number; accountId: number; planId: number; status: CommercialStatus; startsAt: string; endsAt?: string | null; monthlyFeeOverride?: string | number | null; plan: CommercialPlan }
export type BillingAlert = { id: number; accountId: number; severity: 'INFO' | 'LOW_BALANCE' | 'CRITICAL_BALANCE' | 'HARD_STOP'; title: string; body?: string | null; balanceAt?: string | number | null; thresholdValue?: string | number | null; isRead: boolean; createdAt: string }
export type WalletTransaction = { id: number; type: string; direction: string; amount: string | number; balanceAfter: string | number; referenceType?: string | null; referenceId?: string | null; description?: string | null; createdAt: string }
export type PaymentRequest = { id: number; accountId: number; amount: string | number; currency: string; requestedAddons?: CommercialAddonCode[] | null; paymentMethod?: string | null; paymentReference?: string | null; proofUrl?: string | null; notes?: string | null; status: PaymentRequestStatus; reviewedAt?: string | null; createdAt: string; account?: Pick<CommercialAccount, 'id' | 'name' | 'code' | 'currency'>; requestedPlan?: CommercialPlan | null }
export type CommercialSummary = { account: CommercialAccount; wallet: CommercialWallet | null; balanceState: 'HEALTHY' | 'LOW_BALANCE' | 'CRITICAL_BALANCE' | 'HARD_STOP'; subscription: CommercialSubscription | null; addons: CommercialAddonStatus[]; alerts: BillingAlert[]; latestTransactions: WalletTransaction[]; callerIdControl: { dynamicCallerIdEnabled: boolean; verifiedCallerIds: number; activeVerifiedCallerIds: number; availableNumbers: Array<{ id: number; displayNumber: string; displayName?: string | null; scope: string; provider?: string | null }> } }
export type CommercialCatalog = { plans: CommercialPlan[]; addons: CommercialAddon[] }

const commercialRequestConfig = { timeout: 45000 }
const commercialGetConfig = (silent: boolean, config = {}) => {
  const nextConfig = { ...commercialRequestConfig, ...config }
  return silent ? silentOverlayConfig(nextConfig) : nextConfig
}
const swrMemory = new Map<string, unknown>()
const swrPrefix = 'ptdt-commercial-control-api-swr:'
const swrMaxAgeMs = 30 * 60 * 1000

type SwrRecord<T> = { savedAt: number; data: T }
type CommercialSwrOptions = { silent?: boolean; signal?: AbortSignal }

const cacheKey = (key: string) => `${swrPrefix}${key}`

const readSwr = <T>(key: string): T | null => {
  const memory = swrMemory.get(key) as SwrRecord<T> | undefined
  const now = Date.now()
  if (memory && now - memory.savedAt < swrMaxAgeMs) return memory.data
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(cacheKey(key))
    if (!raw) return null
    const stored = JSON.parse(raw) as SwrRecord<T>
    if (!stored?.savedAt || now - stored.savedAt > swrMaxAgeMs) return null
    swrMemory.set(key, stored)
    return stored.data
  } catch {
    return null
  }
}

const writeSwr = <T>(key: string, data: T) => {
  const record: SwrRecord<T> = { savedAt: Date.now(), data }
  swrMemory.set(key, record)
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(cacheKey(key), JSON.stringify(record)) } catch { /* ignore localStorage cache write failures */ }
}

const removeSwr = (key: string) => {
  swrMemory.delete(key)
  if (typeof window !== 'undefined') window.localStorage.removeItem(cacheKey(key))
}

const clearCommercialSwr = (accountId?: number) => {
  removeSwr('accounts')
  removeSwr('catalog')
  if (accountId) {
    removeSwr(`summary:${accountId}`)
    removeSwr(`payments:${accountId}`)
  }
}

const swr = async <T>(key: string, request: (silent: boolean) => Promise<T>, options: CommercialSwrOptions = {}): Promise<T> => {
  const cached = readSwr<T>(key)
  if (cached) {
    void request(true).then(data => writeSwr(key, data)).catch(() => undefined)
    return cached
  }
  const data = await request(Boolean(options.silent))
  writeSwr(key, data)
  return data
}

export const commercialControlApi = {
  seedCatalog: async () => {
    const res = await api.post('/commercial-control/admin/seed-catalog', undefined, commercialRequestConfig)
    clearCommercialSwr()
    return res.data.data as CommercialSummary
  },
  getCatalog: async (options?: CommercialSwrOptions) => swr('catalog', async silent => {
    const res = await api.get('/commercial-control/catalog', commercialGetConfig(silent, { signal: options?.signal }))
    return res.data.data as CommercialCatalog
  }, options),
  getSummary: async (accountId?: number, options?: CommercialSwrOptions) => {
    const key = `summary:${accountId || 'default'}`
    return swr(key, async silent => {
      const res = await api.get('/commercial-control/summary', commercialGetConfig(silent, { params: accountId ? { accountId } : undefined, signal: options?.signal }))
      const data = res.data.data as CommercialSummary
      if (data?.account?.id) writeSwr(`summary:${data.account.id}`, data)
      return data
    }, options)
  },
  listAccounts: async (options?: CommercialSwrOptions) => swr('accounts', async silent => {
    const res = await api.get('/commercial-control/admin/accounts', commercialGetConfig(silent, { signal: options?.signal }))
    return res.data.data as CommercialAccount[]
  }, options),
  createAccount: async (payload: { name: string; code?: string; email?: string; phone?: string; currency?: string; lowBalanceThreshold?: string; criticalBalanceThreshold?: string }) => {
    const res = await api.post('/commercial-control/admin/accounts', payload, commercialRequestConfig)
    clearCommercialSwr()
    return res.data.data as CommercialAccount
  },
  listPaymentRequests: async (accountId?: number, options?: CommercialSwrOptions) => swr(`payments:${accountId || 'all'}`, async silent => {
    const res = await api.get('/commercial-control/admin/payment-requests', commercialGetConfig(silent, { params: accountId ? { accountId } : undefined, signal: options?.signal }))
    return res.data.data as PaymentRequest[]
  }, options),
  createPaymentRequest: async (payload: { accountId: number; amount: string; currency?: string; requestedPlanCode?: CommercialPlanCode | ''; requestedAddonCodes?: CommercialAddonCode[]; paymentMethod?: string; paymentReference?: string; proofUrl?: string; notes?: string }) => {
    const res = await api.post('/commercial-control/admin/payment-requests', { ...payload, requestedPlanCode: payload.requestedPlanCode || null }, commercialRequestConfig)
    clearCommercialSwr(payload.accountId)
    return res.data.data as PaymentRequest
  },
  updatePaymentRequestStatus: async (id: number, status: PaymentRequestStatus) => {
    const res = await api.patch(`/commercial-control/admin/payment-requests/${id}/status`, { status }, commercialRequestConfig)
    const data = res.data.data as PaymentRequest
    clearCommercialSwr(data.accountId)
    return data
  },
  activatePlan: async (accountId: number, payload: { planCode: CommercialPlanCode; status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TRIAL'; monthlyFeeOverride?: string; endsAt?: string; notes?: string }) => {
    const res = await api.post(`/commercial-control/admin/accounts/${accountId}/activate-plan`, payload, commercialRequestConfig)
    clearCommercialSwr(accountId)
    return res.data.data as CommercialSubscription
  },
  topUpWallet: async (accountId: number, payload: { amount: string; description?: string; reference?: string }) => {
    const res = await api.post(`/commercial-control/admin/accounts/${accountId}/topup`, payload, commercialRequestConfig)
    clearCommercialSwr(accountId)
    return res.data.data as { wallet: CommercialWallet; transaction: WalletTransaction }
  },
  setAddonStatus: async (accountId: number, addonCode: CommercialAddonCode, payload: { status: CommercialStatus; priceOverride?: string; notes?: string }) => {
    const res = await api.patch(`/commercial-control/admin/accounts/${accountId}/addons/${addonCode}`, payload, commercialRequestConfig)
    clearCommercialSwr(accountId)
    return res.data.data
  },
  updateThresholds: async (accountId: number, payload: { lowBalanceThreshold?: string; criticalBalanceThreshold?: string; hardStopEnabled?: boolean }) => {
    const res = await api.patch(`/commercial-control/admin/accounts/${accountId}/thresholds`, payload, commercialRequestConfig)
    clearCommercialSwr(accountId)
    return res.data.data as CommercialAccount
  },
}
