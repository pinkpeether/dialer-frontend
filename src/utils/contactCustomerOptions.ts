import { administrationApi, type AdminCommercialAccount } from '../api/administration.api'

type CustomerAccount = { id: number | null; name: string; code: string; status: string }

type CampaignLike = { commercialAccount?: CustomerAccount | null }
type ContactLike = { commercialAccount?: CustomerAccount | null; campaign?: { commercialAccount?: CustomerAccount | null } | null }

const isValidAccount = (account?: Partial<AdminCommercialAccount | CustomerAccount> | null): account is Partial<AdminCommercialAccount | CustomerAccount> => Boolean(account && (account.id || account.name))

export const normalizeContactCustomerAccount = (account?: Partial<AdminCommercialAccount | CustomerAccount> | null): CustomerAccount | null => {
  if (!isValidAccount(account)) return null
  return {
    id: account.id ? Number(account.id) : null,
    name: String(account.name || 'Unassigned Customer'),
    code: String(account.code || '—'),
    status: String(account.status || '—'),
  }
}

export const uniqueContactCustomerAccounts = (accounts: Array<CustomerAccount | null | undefined>) => {
  const map = new Map<number | string, CustomerAccount>()
  accounts.forEach(account => {
    if (!account) return
    const key = account.id ?? account.name
    if (!map.has(key)) map.set(key, account)
  })
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export const loadAllowedContactCustomers = async () => {
  const me = await administrationApi.getMe({ silent: true }).catch(() => null)
  const membershipAccounts = me?.memberships?.map(membership => normalizeContactCustomerAccount(membership.account)).filter(Boolean) || []

  if (me?.platformAccess) {
    const overview = await administrationApi.getPlatformOverview({ silent: true })
    return uniqueContactCustomerAccounts([
      ...overview.accounts.map(account => normalizeContactCustomerAccount(account)),
      ...membershipAccounts,
    ])
  }

  return uniqueContactCustomerAccounts(membershipAccounts)
}

export const deriveContactCustomers = (commercialAccounts: CustomerAccount[], campaigns: CampaignLike[], contacts: ContactLike[]) => uniqueContactCustomerAccounts([
  ...commercialAccounts,
  ...campaigns.map(campaign => normalizeContactCustomerAccount(campaign.commercialAccount)),
  ...contacts.map(contact => normalizeContactCustomerAccount(contact.commercialAccount) || normalizeContactCustomerAccount(contact.campaign?.commercialAccount)),
])
