import api from './axios'

export type AccountReviewUser = { id: number; name: string; email: string; role: string; isActive: boolean }
export type AccountReview = {
  account: { id: number; name: string; code: string; status: string; email?: string | null; phone?: string | null; currency: string; createdAt: string }
  confirmationPhrase: string
  counts: Record<string, number>
  users: { exclusive: AccountReviewUser[]; retained: AccountReviewUser[] }
  warning: string
  storageNote: string
}

const dataOf = <T>(response: { data: unknown }): T => {
  const payload = response.data as { data?: unknown }
  return (payload?.data ?? response.data) as T
}

export const accountReviewApi = {
  getReview: async (accountId: number): Promise<AccountReview> => {
    const response = await api.get(`/account-review/accounts/${accountId}/review`)
    return dataOf<AccountReview>(response)
  },
}
