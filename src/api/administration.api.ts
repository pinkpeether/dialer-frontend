import api from './axios'
import { clearSwrByPrefix, silentOverlayConfig, swr, swrKey } from './swrCache'

export type PlatformUserRole = 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER_ADMIN' | 'MANAGER' | 'SUPERVISOR' | 'AGENT'
export type CommercialAccountRole = 'OWNER' | 'ADMIN' | 'BILLING' | 'SUPERVISOR' | 'AGENT'
export type CommercialMembershipStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

export type AdminUser = {
  id: number
  name: string
  email: string
  role: PlatformUserRole | string
  status?: string
  isActive?: boolean
  extension?: string | null
  agentCode?: string | null
}

export type AdminCommercialAccount = {
  id: number
  name: string
  code: string
  status: string
  email?: string | null
  phone?: string | null
  currency: string
  lowBalanceThreshold?: string | number
  criticalBalanceThreshold?: string | number
  hardStopEnabled?: boolean
  memberships?: Array<{
    id: number
    accountId: number
    userId: number
    status: CommercialMembershipStatus
    user?: AdminUser
  }>
  wallet?: {
    id: number
    availableBalance: string | number
    heldBalance?: string | number
    creditLimit?: string | number
    currency: string
  } | null
  subscriptions?: Array<{
    id: number
    status: string
    plan?: { id: number; code: string; name: string } | null
  }>
  addons?: Array<{
    id: number
    status: string
    addon?: { id: number; code: string; name: string } | null
  }>
}

export type AccountMembership = {
  id: number
  accountId: number
  userId: number
  accountRole: CommercialAccountRole
  status: CommercialMembershipStatus
  canManageUsers: boolean
  canManageBilling: boolean
  canManageCampaigns: boolean
  canViewReports: boolean
  canUseDynamicCallerId: boolean
  notes?: string | null
  createdAt: string
  updatedAt: string
  user?: AdminUser
  account?: AdminCommercialAccount
}

export type AdministrationMe = {
  user: AdminUser
  platformAccess: boolean
  recommendedDashboard: string
  memberships: AccountMembership[]
  capabilities: {
    canAccessPlatformAdministration: boolean
    canViewBilling: boolean
    canManageUsers: boolean
    canManageCampaigns: boolean
    canUseDynamicCallerId: boolean
  }
}

export type PlatformAdministrationOverview = {
  accounts: AdminCommercialAccount[]
  users: AdminUser[]
  platformUsers?: AdminUser[]
  assignableCustomerUsers?: AdminUser[]
  stats: {
    accounts: number
    users: number
    memberships: number
    activeAccounts: number
    platformAdmins: number
    customerAdmins: number
  }
}

export type AddAccountMemberPayload = {
  userId: number
  accountRole: CommercialAccountRole
  status?: CommercialMembershipStatus
  canManageUsers?: boolean
  canManageBilling?: boolean
  canManageCampaigns?: boolean
  canViewReports?: boolean
  canUseDynamicCallerId?: boolean
  notes?: string | null
}

const administrationRequestConfig = { timeout: 45000 }
const administrationGetConfig = (silent: boolean) => (
  silent ? silentOverlayConfig(administrationRequestConfig) : administrationRequestConfig
)
type AdministrationSwrOptions = { silent?: boolean }

const isArchivedAccount = (account?: { status?: string | null }) => String(account?.status || '').toUpperCase() === 'ARCHIVED'
const withoutArchivedAccounts = (overview: PlatformAdministrationOverview): PlatformAdministrationOverview => {
  const accounts = overview.accounts.filter(account => !isArchivedAccount(account))
  return {
    ...overview,
    accounts,
    stats: {
      ...overview.stats,
      accounts: accounts.length,
      activeAccounts: accounts.filter(account => account.status === 'ACTIVE').length,
    },
  }
}

export const administrationApi = {
  getMe: async (options?: AdministrationSwrOptions) => swr(
    swrKey('administration-me', { type: 'current-user' }),
    async ({ silent }) => {
      const res = await api.get('/administration/me', administrationGetConfig(silent))
      const data = res.data.data as AdministrationMe
      return {
        ...data,
        memberships: data.memberships.filter(membership => !isArchivedAccount(membership.account)),
      }
    },
    options,
  ),

  getPlatformOverview: async (options?: AdministrationSwrOptions) => swr(
    swrKey('administration-platform', { type: 'overview' }),
    async ({ silent }) => {
      const res = await api.get('/administration/platform/overview', administrationGetConfig(silent))
      return withoutArchivedAccounts(res.data.data as PlatformAdministrationOverview)
    },
    options,
  ),

  listPlatformAccountMembers: async (accountId: number, options?: AdministrationSwrOptions) => swr(
    swrKey('administration-platform', { type: 'members', accountId }),
    async ({ silent }) => {
      const res = await api.get(`/administration/platform/accounts/${accountId}/members`, administrationGetConfig(silent))
      return res.data.data as AccountMembership[]
    },
    options,
  ),

  addPlatformAccountMember: async (accountId: number, payload: AddAccountMemberPayload) => {
    const res = await api.post(`/administration/platform/accounts/${accountId}/members`, payload, administrationRequestConfig)
    clearSwrByPrefix('administration-platform')
    clearSwrByPrefix('administration-me')
    return res.data.data as AccountMembership
  },

  updatePlatformMembership: async (membershipId: number, payload: Partial<AddAccountMemberPayload>) => {
    const res = await api.patch(`/administration/platform/memberships/${membershipId}`, payload, administrationRequestConfig)
    clearSwrByPrefix('administration-platform')
    clearSwrByPrefix('administration-me')
    return res.data.data as AccountMembership
  },

  suspendPlatformMembership: async (membershipId: number) => {
    const res = await api.patch(`/administration/platform/memberships/${membershipId}/suspend`, undefined, administrationRequestConfig)
    clearSwrByPrefix('administration-platform')
    clearSwrByPrefix('administration-me')
    return res.data.data as AccountMembership
  },

  removePlatformMembership: async (membershipId: number) => {
    const res = await api.delete(`/administration/platform/memberships/${membershipId}`, administrationRequestConfig)
    clearSwrByPrefix('administration-platform')
    clearSwrByPrefix('administration-me')
    return res.data.data as { deleted: boolean }
  },

  listMyAccountMembers: async (accountId: number) => {
    const res = await api.get(`/administration/accounts/${accountId}/members`, administrationRequestConfig)
    return res.data.data as AccountMembership[]
  },
}
