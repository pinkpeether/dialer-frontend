import api from './axios'

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

export const administrationApi = {
  getMe: async () => {
    const res = await api.get('/administration/me', administrationRequestConfig)
    return res.data.data as AdministrationMe
  },

  getPlatformOverview: async () => {
    const res = await api.get('/administration/platform/overview', administrationRequestConfig)
    return res.data.data as PlatformAdministrationOverview
  },

  listPlatformAccountMembers: async (accountId: number) => {
    const res = await api.get(`/administration/platform/accounts/${accountId}/members`, administrationRequestConfig)
    return res.data.data as AccountMembership[]
  },

  addPlatformAccountMember: async (accountId: number, payload: AddAccountMemberPayload) => {
    const res = await api.post(`/administration/platform/accounts/${accountId}/members`, payload, administrationRequestConfig)
    return res.data.data as AccountMembership
  },

  updatePlatformMembership: async (membershipId: number, payload: Partial<AddAccountMemberPayload>) => {
    const res = await api.patch(`/administration/platform/memberships/${membershipId}`, payload, administrationRequestConfig)
    return res.data.data as AccountMembership
  },

  suspendPlatformMembership: async (membershipId: number) => {
    const res = await api.patch(`/administration/platform/memberships/${membershipId}/suspend`, undefined, administrationRequestConfig)
    return res.data.data as AccountMembership
  },

  removePlatformMembership: async (membershipId: number) => {
    const res = await api.delete(`/administration/platform/memberships/${membershipId}`, administrationRequestConfig)
    return res.data.data as { deleted: boolean }
  },

  listMyAccountMembers: async (accountId: number) => {
    const res = await api.get(`/administration/accounts/${accountId}/members`, administrationRequestConfig)
    return res.data.data as AccountMembership[]
  },
}
