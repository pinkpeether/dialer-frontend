import api from './axios'
import { clearAdministrationCache } from './administration.api'
import { clearCommercialControlCache } from './commercialControl.api'

export type AccountReviewUser = { id: number; name: string; email: string; role: string; isActive: boolean }

export type AccountReview = {
  account: { id: number; name: string; code: string; status: string; email?: string | null; phone?: string | null; currency: string; createdAt: string }
  confirmationPhrase: string
  counts: Record<string, number>
  users: { exclusive: AccountReviewUser[]; retained: AccountReviewUser[] }
  warning: string
  storageNote: string
}

export type AccountActionResult = {
  success: boolean
  account: AccountReview['account']
  changed: Record<string, number>
  retainedUsers: AccountReviewUser[]
  storageNote: string
}

const dataOf = <T>(response: { data: unknown }): T => {
  const payload = response.data as { data?: unknown }
  return (payload?.data ?? response.data) as T
}

const clearCustomerProfileCaches = () => {
  clearCommercialControlCache()
  clearAdministrationCache()
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('ptdt-platform-administration:last-good')
    window.localStorage.removeItem('ptdt-customer-billing:last-good')
    window.dispatchEvent(new CustomEvent('ptdt:commercial-accounts-changed'))
  }
}

export const accountReviewApi = {
  getReview: async (accountId: number): Promise<AccountReview> => {
    const response = await api.get(`/account-review/accounts/${accountId}/review`)
    return dataOf<AccountReview>(response)
  },

  runAction: async (accountId: number, confirmationPhrase: string): Promise<AccountActionResult> => {
    const response = await api.post(`/account-review/accounts/${accountId}/action`, { confirmationPhrase })
    const result = dataOf<AccountActionResult>(response)
    clearCustomerProfileCaches()
    return result
  },
}
