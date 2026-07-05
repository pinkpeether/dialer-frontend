import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BadgeDollarSign, Building2, CreditCard, RefreshCw, Users, WalletCards } from 'lucide-react'
import { administrationApi, type AccountMembership, type AdminCommercialAccount } from '../api/administration.api'
import { cleanDisplayText } from '../utils/displayText'

const card = { padding: 18, borderRadius: 18 } as const
const CACHE_KEY = 'ptdt-customer-billing:last-good'

const money = (value: string | number | undefined | null, currency = 'USD') => `${currency} ${Number(value || 0).toFixed(2)}`

const balanceState = (balance: number, low: number, critical: number, hardStop: boolean) => {
  if (hardStop && balance <= 0) return 'HARD_STOP'
  if (balance <= critical) return 'CRITICAL_BALANCE'
  if (balance <= low) return 'LOW_BALANCE'
  return 'HEALTHY'
}

const stateColor = (state: string) => {
  if (state === 'HEALTHY' || state === 'ACTIVE') return 'var(--green-2)'
  if (state === 'LOW_BALANCE') return 'var(--orange)'
  if (state === 'CRITICAL_BALANCE' || state === 'HARD_STOP' || state === 'SUSPENDED') return 'var(--danger)'
  return 'var(--text-3)'
}

type CustomerBillingCache = {
  savedAt: string
  memberships: AccountMembership[]
  accounts?: AdminCommercialAccount[]
  selectedMembershipId?: number
}

const readCache = (): CustomerBillingCache | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) as CustomerBillingCache : null
  } catch {
    return null
  }
}

const writeCache = (cache: Omit<CustomerBillingCache, 'savedAt'>) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...cache, savedAt: new Date().toISOString() }))
  } catch {
    // Local cache is best-effort only.
  }
}

const planName = (account?: AdminCommercialAccount | null) => account?.subscriptions?.[0]?.plan?.name || 'No active plan'
const planStatus = (account?: AdminCommercialAccount | null) => account?.subscriptions?.[0]?.status || 'INACTIVE'

const balanceInfo = (account?: AdminCommercialAccount | null) => {
  const balance = Number(account?.wallet?.availableBalance || 0)
  const low = Number(account?.lowBalanceThreshold || 10)
  const critical = Number(account?.criticalBalanceThreshold || 3)
  return {
    balance,
    low,
    critical,
    state: balanceState(balance, low, critical, Boolean(account?.hardStopEnabled)),
  }
}

function AccountHealthTable({ accounts }: { accounts: AdminCommercialAccount[] }) {
  return (
    <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: 18, borderBottom: '1px solid var(--border)' }}>
        <div className="eyebrow pink"><Building2 size={12} /> Commercial Account Overview</div>
        <p style={{ margin: '8px 0 0', color: 'var(--text-3)', fontSize: 13 }}>
          Read-only customer account billing and plan health summary.
        </p>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
          <thead>
            <tr>
              {['Customer Account', 'Current Plan', 'Status', 'Calling Wallet', 'Balance Health', 'Users', 'Dynamic CID Users', 'Add-ons'].map(header => (
                <th key={header} className="mono" style={{ padding: '13px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 900, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid var(--border)' }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 28, color: 'var(--text-3)', textAlign: 'center' }}>
                  No commercial accounts found.
                </td>
              </tr>
            ) : accounts.map(account => {
              const info = balanceInfo(account)
              const activeMembers = account.memberships?.filter(item => item.status === 'ACTIVE') || []
              const cidUsers = activeMembers.filter(item => Boolean((item as Record<string, unknown>).canUseDynamicCallerId)).length
              const activeAddons = account.addons?.filter(item => item.status === 'ACTIVE') || []
              const subscriptionState = planStatus(account)

              return (
                <tr key={account.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 950, color: 'var(--text)' }}>{cleanDisplayText(account.name)}</div>
                    <div className="mono" style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 3 }}>{cleanDisplayText(account.code)}</div>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-2)', fontWeight: 800 }}>{planName(account)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span className="badge" style={{ color: stateColor(subscriptionState), background: 'var(--bg-2)', border: `1px solid ${stateColor(subscriptionState)}` }}>
                      {cleanDisplayText(subscriptionState)}
                    </span>
                  </td>
                  <td className="mono" style={{ padding: '14px 16px', color: 'var(--text)' }}>{money(account.wallet?.availableBalance, account.currency)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span className="badge" style={{ color: stateColor(info.state), background: 'var(--bg-2)', border: `1px solid ${stateColor(info.state)}` }}>
                      {info.state.replaceAll('_', ' ')}
                    </span>
                  </td>
                  <td className="mono" style={{ padding: '14px 16px', color: 'var(--text-2)' }}>{activeMembers.length}</td>
                  <td className="mono" style={{ padding: '14px 16px', color: 'var(--text-2)' }}>{cidUsers}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-3)' }}>
                    {activeAddons.length ? activeAddons.map(item => cleanDisplayText(item.addon?.name || item.addon?.code)).join(', ') : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MembershipSelector({ memberships, selectedMembership, platformAccounts, onSelect }: {
  memberships: AccountMembership[]
  selectedMembership?: AccountMembership
  platformAccounts: AdminCommercialAccount[]
  onSelect: (id: number) => void
}) {
  if (memberships.length <= 1) return null

  return (
    <div className="glass" style={{ ...card, marginTop: 18, marginBottom: 18 }}>
      <div className="eyebrow pink"><Building2 size={12} /> Select Commercial Account</div>
      <select
        className="ptdt-select"
        value={selectedMembership?.id || ''}
        onChange={event => {
          const next = Number(event.target.value)
          onSelect(next)
          writeCache({ memberships, accounts: platformAccounts, selectedMembershipId: next })
        }}
        style={{ marginTop: 12, maxWidth: 420 }}
      >
        {memberships.map(item => (
          <option key={item.id} value={item.id}>{cleanDisplayText(item.account?.name || `Account #${item.accountId}`)} — {cleanDisplayText(item.accountRole)}</option>
        ))}
      </select>
    </div>
  )
}

function SelectedAccountDetails({ account, selectedMembership }: { account: AdminCommercialAccount; selectedMembership?: AccountMembership }) {
  const subscription = account.subscriptions?.[0]
  const info = balanceInfo(account)
  const activeAddons = account.addons?.filter(item => item.status === 'ACTIVE') || []
  const isSupervisorMembership = selectedMembership?.accountRole === 'SUPERVISOR'

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 18, marginBottom: 18 }}>
        <div className="glass" style={card}>
          <div className="eyebrow pink"><CreditCard size={12} /> Current Plan</div>
          <h2 style={{ margin: '10px 0 4px', fontSize: 26, fontWeight: 950 }}>{subscription?.plan?.name || 'No active plan'}</h2>
          <p style={{ margin: 0, color: stateColor(subscription?.status || 'INACTIVE'), fontWeight: 900 }}>{cleanDisplayText(subscription?.status || 'INACTIVE')}</p>
        </div>
        <div className="glass" style={card}>
          <div className="eyebrow green"><WalletCards size={12} /> Calling Balance</div>
          <h2 style={{ margin: '10px 0 4px', fontSize: 26, fontWeight: 950 }}>{money(account.wallet?.availableBalance, account.currency)}</h2>
          <p style={{ margin: 0, color: stateColor(info.state), fontWeight: 900 }}>{info.state.replaceAll('_', ' ')}</p>
        </div>
        <div className="glass" style={card}>
          <div className="eyebrow pink"><BadgeDollarSign size={12} /> Thresholds</div>
          <p style={{ margin: '10px 0 4px', color: 'var(--text-2)' }}>Low: <strong>{money(account.lowBalanceThreshold, account.currency)}</strong></p>
          <p style={{ margin: 0, color: 'var(--text-2)' }}>Critical: <strong>{money(account.criticalBalanceThreshold, account.currency)}</strong></p>
        </div>
      </div>

      <div className="glass" style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <div className="eyebrow green"><Users size={12} /> Account Access</div>
            <h2 style={{ margin: '8px 0 4px', fontSize: 22, fontWeight: 950 }}>{account.name}</h2>
            <p style={{ margin: 0, color: 'var(--text-3)' }}>Your account role: <strong>{cleanDisplayText(selectedMembership?.accountRole)}</strong></p>
          </div>
          <span className="ptdt-chip">{cleanDisplayText(account.code)}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 18 }}>
          {[
            [isSupervisorMembership ? 'Manage Agents' : 'Manage Users', isSupervisorMembership || Boolean(selectedMembership?.canManageUsers)],
            ['Manage Billing', Boolean(selectedMembership?.canManageBilling)],
            ['Manage Campaigns', Boolean(selectedMembership?.canManageCampaigns)],
            ['View Reports', Boolean(selectedMembership?.canViewReports)],
            ['Dynamic Caller ID', Boolean(selectedMembership?.canUseDynamicCallerId)],
          ].map(([label, enabled]) => (
            <div key={String(label)} style={{ padding: 14, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-glass)' }}>
              <div style={{ fontWeight: 900, color: enabled ? 'var(--green-2)' : 'var(--text-3)' }}>{enabled ? 'Enabled' : 'Disabled'}</div>
              <div style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass" style={{ ...card, marginTop: 18 }}>
        <div className="eyebrow pink"><CreditCard size={12} /> Active Add-ons</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
          {activeAddons.length === 0 ? (
            <span style={{ color: 'var(--text-3)' }}>No paid add-ons active.</span>
          ) : activeAddons.map(item => (
            <span key={item.id} className="ptdt-chip" style={{ color: 'var(--green-2)' }}>{cleanDisplayText(item.addon?.name || item.addon?.code)}</span>
          ))}
        </div>
      </div>
    </>
  )
}

export default function CustomerBillingPortal() {
  const cached = useMemo(() => readCache(), [])
  const [memberships, setMemberships] = useState<AccountMembership[]>(cached?.memberships ?? [])
  const [platformAccounts, setPlatformAccounts] = useState<AdminCommercialAccount[]>(cached?.accounts ?? [])
  const [platformAccess, setPlatformAccess] = useState(false)
  const [selectedMembershipId, setSelectedMembershipId] = useState<number | undefined>(cached?.selectedMembershipId)
  const [loading, setLoading] = useState(!cached?.memberships.length && !cached?.accounts?.length)
  const [refreshing, setRefreshing] = useState(Boolean(cached?.memberships.length || cached?.accounts?.length))
  const hasVisibleDataRef = useRef(Boolean(cached?.memberships.length || cached?.accounts?.length))
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')

  const selectedMembership = useMemo(
    () => memberships.find(item => item.id === selectedMembershipId) || memberships[0],
    [memberships, selectedMembershipId],
  )
  const account = selectedMembership?.account
  const customerAccounts = useMemo(
    () => platformAccess ? platformAccounts : memberships.map(item => item.account).filter(Boolean) as AdminCommercialAccount[],
    [platformAccess, platformAccounts, memberships],
  )

  const loadData = useCallback(async (options: { silent?: boolean } = {}) => {
    if (options.silent || hasVisibleDataRef.current) setRefreshing(true)
    else setLoading(true)
    setError('')
    setWarning('')

    try {
      const me = await administrationApi.getMe({ silent: Boolean(options.silent || hasVisibleDataRef.current) })
      setPlatformAccess(Boolean(me.platformAccess))
      setMemberships(me.memberships)

      let accounts: AdminCommercialAccount[] = []
      if (me.platformAccess) {
        const overview = await administrationApi.getPlatformOverview({ silent: true })
        accounts = overview.accounts
        setPlatformAccounts(accounts)
      } else {
        setPlatformAccounts([])
      }

      setSelectedMembershipId(prev => {
        const next = prev || me.memberships[0]?.id
        writeCache({ memberships: me.memberships, accounts, selectedMembershipId: next })
        return next
      })
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Failed to load billing portal'
      if (hasVisibleDataRef.current) setWarning(`Showing cached billing data. ${detail}`)
      else setError(detail)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadData({ silent: Boolean(cached?.memberships.length || cached?.accounts?.length) })
  }, [cached?.accounts?.length, cached?.memberships.length, loadData])

  useEffect(() => {
    hasVisibleDataRef.current = memberships.length > 0 || platformAccounts.length > 0
  }, [memberships.length, platformAccounts.length])

  return (
    <div className="ptdt-page">
      <div className="ptdt-page-header">
        <div>
          <div className="eyebrow green" style={{ marginBottom: 12 }}><WalletCards size={12} /> Customer Account</div>
          <h1 className="ptdt-page-title">Billing & <span className="gradient-brand-text">Plan</span></h1>
          <p className="ptdt-page-desc">Read-only commercial account plan, wallet, balance health, and access summary. Payments are still approved manually by PTDT.</p>
        </div>
        <div className="ptdt-toolbar">
          {refreshing && <span className="ptdt-chip">Refreshing...</span>}
          <button type="button" className="ptdt-action-btn" onClick={() => void loadData()} disabled={loading || refreshing}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="glass" style={{ padding: 14, marginBottom: 14, color: 'var(--danger)', borderColor: 'rgba(239,68,68,.26)' }}>{error}</div>}
      {warning && <div className="glass" style={{ padding: 14, marginBottom: 14, color: 'var(--orange)', borderColor: 'rgba(240,185,11,.26)' }}>{warning}</div>}

      {loading ? (
        <div className="glass" style={card}>Loading billing details...</div>
      ) : customerAccounts.length === 0 ? (
        <div className="glass" style={card}>No commercial account assigned yet.</div>
      ) : (
        <>
          <AccountHealthTable accounts={customerAccounts} />

          {!platformAccess && (
            <>
              <MembershipSelector
                memberships={memberships}
                selectedMembership={selectedMembership}
                platformAccounts={platformAccounts}
                onSelect={setSelectedMembershipId}
              />

              {account && <SelectedAccountDetails account={account} selectedMembership={selectedMembership} />}
            </>
          )}
        </>
      )}
    </div>
  )
}
