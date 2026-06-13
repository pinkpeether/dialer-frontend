import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Building2, Crown, RefreshCw, UserPlus, Users } from 'lucide-react'
import { administrationApi, type AccountMembership, type AdminCommercialAccount, type AdminUser, type CommercialAccountRole, type CommercialMembershipStatus } from '../api/administration.api'
import PtdtBusyOverlay from '../components/PtdtBusyOverlay'

const platformRoles = new Set(['SUPER_ADMIN', 'ADMIN'])
const accountRoleOptions: CommercialAccountRole[] = ['OWNER', 'ADMIN', 'BILLING', 'SUPERVISOR', 'AGENT']
const CACHE_KEY = 'ptdt-platform-administration:last-good'

const accountThemes = [
  { bg: 'rgba(251,11,140,.08)', border: 'rgba(251,11,140,.42)', accent: '#fb0b8c' },
  { bg: 'rgba(128,87,215,.09)', border: 'rgba(128,87,215,.38)', accent: '#8057d7' },
  { bg: 'rgba(0,167,71,.08)', border: 'rgba(0,167,71,.34)', accent: '#00a747' },
  { bg: 'rgba(240,185,11,.10)', border: 'rgba(240,185,11,.36)', accent: '#f0b90b' },
  { bg: 'rgba(14,165,233,.08)', border: 'rgba(14,165,233,.34)', accent: '#0ea5e9' },
]

type PlatformAdminCache = {
  savedAt: string
  selectedAccountId?: number
  accounts: AdminCommercialAccount[]
  users: AdminUser[]
  members: AccountMembership[]
}

const readCache = (): PlatformAdminCache | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) as PlatformAdminCache : null
  } catch {
    return null
  }
}

const writeCache = (cache: Omit<PlatformAdminCache, 'savedAt'>) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...cache, savedAt: new Date().toISOString() }))
  } catch {
    // Cache is best-effort only; backend remains source of truth.
  }
}

const themeAt = (index: number) => accountThemes[index % accountThemes.length]
const money = (value: unknown, currency = 'USD') => `${currency} ${Number(value || 0).toFixed(2)}`
const accountRoleLabel = (role: string) => role === 'ADMIN' ? 'Account Admin' : role
const statusColor = (status: string) => status === 'ACTIVE' ? 'var(--green-2)' : status === 'SUSPENDED' ? 'var(--danger)' : 'var(--text-3)'

const switchBox = (active: boolean, pending: boolean): React.CSSProperties => ({
  width: 66,
  height: 34,
  borderRadius: 999,
  padding: 3,
  border: active ? '1px solid rgba(0,167,71,.62)' : '1px solid rgba(148,163,184,.52)',
  background: active ? 'linear-gradient(135deg,#13b85f,#08a64f)' : 'linear-gradient(135deg,#f3f4f6,#d9dce2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: active ? 'flex-end' : 'flex-start',
  cursor: pending ? 'progress' : 'pointer',
  opacity: pending ? 0.7 : 1,
})

const switchDot: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: '50%',
  background: '#fff',
  boxShadow: '0 4px 10px rgba(15,23,42,.22)',
}

export default function PlatformAdministrationV2() {
  const cached = useMemo(() => readCache(), [])
  const [accounts, setAccounts] = useState<AdminCommercialAccount[]>(cached?.accounts ?? [])
  const [users, setUsers] = useState<AdminUser[]>(cached?.users ?? [])
  const [members, setMembers] = useState<AccountMembership[]>(cached?.members ?? [])
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>(cached?.selectedAccountId)
  const [loading, setLoading] = useState(!cached?.accounts?.length)
  const [refreshing, setRefreshing] = useState(Boolean(cached?.accounts?.length))
  const [saving, setSaving] = useState(false)
  const [pendingMembershipId, setPendingMembershipId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    userId: '',
    accountRole: 'OWNER' as CommercialAccountRole,
    canManageUsers: true,
    canManageBilling: true,
    canManageCampaigns: true,
    canViewReports: true,
    canUseDynamicCallerId: true,
  })

  const selectedAccount = accounts.find(account => account.id === selectedAccountId) || accounts[0]
  const selectedIndex = Math.max(0, accounts.findIndex(account => account.id === selectedAccount?.id))
  const selectedTheme = themeAt(selectedIndex)
  const initialLoading = loading && accounts.length === 0
  const selectedMemberUserIds = useMemo(() => new Set(members.map(member => member.userId)), [members])

  const assignableUsers = useMemo(() => {
    const selectedId = selectedAccount?.id
    const otherAccountMemberIds = new Set<number>()

    accounts.forEach(account => {
      if (account.id === selectedId) return
      account.memberships?.forEach(member => otherAccountMemberIds.add(member.userId))
    })

    return users.filter(user => {
      if (platformRoles.has(String(user.role).toUpperCase())) return false
      if (selectedMemberUserIds.has(user.id)) return true
      return !otherAccountMemberIds.has(user.id)
    })
  }, [accounts, selectedAccount?.id, selectedMemberUserIds, users])

  const loadMembers = async (accountId: number) => {
    const nextMembers = await administrationApi.listPlatformAccountMembers(accountId)
    setMembers(nextMembers)
    writeCache({ selectedAccountId: accountId, accounts, users, members: nextMembers })
    return nextMembers
  }

  const loadData = async (accountId?: number, mode: 'initial' | 'refresh' = 'refresh') => {
    if (mode === 'initial' && !accounts.length) setLoading(true)
    else setRefreshing(true)
    setError('')
    setMessage('')

    try {
      const overview = await administrationApi.getPlatformOverview()
      const resolvedAccountId = accountId || selectedAccountId || overview.accounts[0]?.id
      const nextMembers = resolvedAccountId ? await administrationApi.listPlatformAccountMembers(resolvedAccountId) : []
      const nextUsers = overview.assignableCustomerUsers || overview.users
      setAccounts(overview.accounts)
      setUsers(nextUsers)
      setSelectedAccountId(resolvedAccountId)
      setMembers(nextMembers)
      writeCache({ selectedAccountId: resolvedAccountId, accounts: overview.accounts, users: nextUsers, members: nextMembers })
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Failed to load platform administration'
      setError(accounts.length ? `Showing cached administration data. ${detail}` : detail)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => { void loadData(cached?.selectedAccountId, cached?.accounts?.length ? 'refresh' : 'initial') }, [])

  const selectAccount = (accountId: number) => {
    if (accountId === selectedAccount?.id) return
    setSelectedAccountId(accountId)
    setMessage('')
    setError('')
    setRefreshing(true)
    void loadMembers(accountId)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load members'))
      .finally(() => setRefreshing(false))
  }

  const assignMember = (event: FormEvent) => {
    event.preventDefault()
    if (!selectedAccount) return
    setSaving(true)
    setError('')
    setMessage('')

    void administrationApi.addPlatformAccountMember(selectedAccount.id, {
      userId: Number(form.userId),
      accountRole: form.accountRole,
      status: 'ACTIVE',
      canManageUsers: form.canManageUsers,
      canManageBilling: form.canManageBilling,
      canManageCampaigns: form.canManageCampaigns,
      canViewReports: form.canViewReports,
      canUseDynamicCallerId: form.canUseDynamicCallerId,
    })
      .then(membership => {
        const nextMembers = [membership, ...members.filter(item => item.id !== membership.id && item.userId !== membership.userId)]
        setMembers(nextMembers)
        writeCache({ selectedAccountId: selectedAccount.id, accounts, users, members: nextMembers })
        setForm(prev => ({ ...prev, userId: '' }))
        setMessage('Account membership assigned.')
        void loadMembers(selectedAccount.id).catch(() => undefined)
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to assign member'))
      .finally(() => setSaving(false))
  }

  const toggleMember = (member: AccountMembership) => {
    const nextStatus: CommercialMembershipStatus = member.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    const previousMembers = members
    const optimisticMembers = members.map(item => item.id === member.id ? { ...item, status: nextStatus } : item)
    setMembers(optimisticMembers)
    writeCache({ selectedAccountId: selectedAccount?.id, accounts, users, members: optimisticMembers })
    setSaving(true)
    setPendingMembershipId(member.id)
    setError('')

    void administrationApi.updatePlatformMembership(member.id, { status: nextStatus })
      .then(updated => {
        const nextMembers = optimisticMembers.map(item => item.id === updated.id ? updated : item)
        setMembers(nextMembers)
        writeCache({ selectedAccountId: selectedAccount?.id, accounts, users, members: nextMembers })
        setMessage(`Membership marked ${nextStatus}.`)
        if (selectedAccount) void loadMembers(selectedAccount.id).catch(() => undefined)
      })
      .catch(err => {
        setMembers(previousMembers)
        writeCache({ selectedAccountId: selectedAccount?.id, accounts, users, members: previousMembers })
        setError(err instanceof Error ? err.message : 'Failed to update member')
      })
      .finally(() => {
        setSaving(false)
        setPendingMembershipId(null)
      })
  }

  return (
    <div className="ptdt-page">
      <PtdtBusyOverlay active={initialLoading} label="Loading administration data" />

      <div className="ptdt-page-header">
        <div>
          <div className="eyebrow pink"><Crown size={12} /> PTDT Platform Control</div>
          <h1 className="ptdt-page-title">Administration <span className="gradient-brand-text">Structure</span></h1>
          <p className="ptdt-page-desc">Assign selected-account members. Dropdown shows only selected-account users and unassigned users.</p>
        </div>
        <button
          type="button"
          className={`ptdt-action-btn ${loading || refreshing ? 'ptdt-refresh-active' : ''}`}
          disabled={loading || refreshing}
          onClick={() => void loadData(selectedAccount?.id, 'refresh')}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <div className="glass" style={{ padding: 14, marginBottom: 14, color: accounts.length ? 'var(--orange)' : 'var(--danger)', borderColor: 'rgba(239,68,68,.26)' }}>{error}</div>}
      {message && <div className="glass" style={{ padding: 14, marginBottom: 14, color: 'var(--green-2)', borderColor: 'rgba(0,167,71,.24)' }}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px,380px) 1fr', gap: 18, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div className="eyebrow green"><Building2 size={12} /> Commercial Accounts</div>
          {initialLoading ? (
            <div className="glass" style={{ padding: 18, borderRadius: 18 }}>Loading accounts...</div>
          ) : accounts.map((account, index) => {
            const theme = themeAt(index)
            const selected = account.id === selectedAccount?.id
            return (
              <button
                key={account.id}
                type="button"
                className="glass"
                onClick={() => selectAccount(account.id)}
                style={{
                  padding: 18,
                  borderRadius: 18,
                  textAlign: 'left',
                  borderColor: selected ? theme.border : 'var(--border)',
                  background: selected ? theme.bg : undefined,
                  cursor: 'pointer',
                  boxShadow: selected ? `0 18px 34px ${theme.accent}18` : undefined,
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span className="mono" style={{ minWidth: 34, color: theme.accent, fontWeight: 950 }}>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <div className="mono" style={{ color: 'var(--text-3)', fontSize: 10 }}>{account.code}</div>
                    <h3 style={{ margin: '6px 0', color: 'var(--text)' }}>{account.name}</h3>
                    <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 12 }}>{account.subscriptions?.[0]?.plan?.name || 'No active plan'} · {money(account.wallet?.availableBalance, account.currency)}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="glass" style={{ padding: 18, borderRadius: 18, borderColor: selectedTheme.border, background: selectedTheme.bg }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
            <div>
              <div className="eyebrow pink"><Users size={12} /> Account Members</div>
              <h2 style={{ margin: '8px 0 4px' }}>{selectedAccount?.name || 'Select account'}</h2>
              <p style={{ margin: 0, color: 'var(--text-3)' }}>Selected account users plus unassigned customer users only.</p>
            </div>
            <span className="ptdt-chip" style={{ color: selectedTheme.accent, borderColor: selectedTheme.border }}>{members.length} members</span>
          </div>

          <form onSubmit={assignMember} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 18 }}>
            <select className="ptdt-select" required value={form.userId} onChange={event => setForm({ ...form, userId: event.target.value })}>
              <option value="">Select user</option>
              {assignableUsers.map(user => {
                const isExistingMember = selectedMemberUserIds.has(user.id)
                return (
                  <option
                    key={user.id}
                    value={user.id}
                    style={isExistingMember ? { color: '#374151', fontWeight: 800, backgroundColor: '#e5e7eb' } : undefined}
                  >
                    {isExistingMember ? '● ' : ''}{user.name} — {user.email} ({user.role})
                  </option>
                )
              })}
            </select>
            <select className="ptdt-select" value={form.accountRole} onChange={event => setForm({ ...form, accountRole: event.target.value as CommercialAccountRole })}>
              {accountRoleOptions.map(role => <option key={role} value={role}>{accountRoleLabel(role)}</option>)}
            </select>
            <button className="btn-brand" type="submit" disabled={saving || !selectedAccount}><UserPlus size={14} /> {saving ? 'Assigning...' : 'Assign Member'}</button>
          </form>

          <div style={{ overflowX: 'auto' }}>
            <table className="ptdt-table" style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
              <thead><tr>{['User', 'Platform Role', 'Account Role', 'Status', 'Active'].map(label => <th key={label} style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid var(--border)' }}>{label}</th>)}</tr></thead>
              <tbody>{members.length === 0 ? <tr><td colSpan={5} style={{ padding: 24, color: 'var(--text-3)' }}>No users assigned to this commercial account yet.</td></tr> : members.map(member => {
                const active = member.status === 'ACTIVE'
                return (
                  <tr
                    key={member.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      opacity: pendingMembershipId === member.id ? 0.52 : 1,
                      transition: 'opacity .18s ease',
                    }}
                  >
                    <td style={{ padding: 12 }}><strong>{member.user?.name || `User #${member.userId}`}</strong><br /><span className="mono" style={{ color: 'var(--text-3)', fontSize: 11 }}>{member.user?.email || '—'}</span></td>
                    <td style={{ padding: 12 }}><span className="ptdt-chip">{member.user?.role || '—'}</span></td>
                    <td style={{ padding: 12, fontWeight: 900 }}>{accountRoleLabel(member.accountRole)}</td>
                    <td style={{ padding: 12, color: statusColor(member.status), fontWeight: 900 }}>{member.status}</td>
                    <td style={{ padding: 12 }}><button type="button" role="switch" aria-checked={active} disabled={pendingMembershipId === member.id} onClick={() => toggleMember(member)} style={switchBox(active, pendingMembershipId === member.id)}><span style={switchDot} /></button></td>
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
