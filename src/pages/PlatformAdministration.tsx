import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Building2, Crown, RefreshCw, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { administrationApi, type AccountMembership, type AdminCommercialAccount, type AdminUser, type CommercialAccountRole, type CommercialMembershipStatus } from '../api/administration.api'

const card = { padding: 18, borderRadius: 18 } as const
const CACHE_KEY = 'ptdt-platform-administration:last-good'

const money = (value: string | number | undefined | null, currency = 'USD') => `${currency} ${Number(value || 0).toFixed(2)}`

const statusColor = (status?: string) => {
  if (status === 'ACTIVE') return 'var(--green-2)'
  if (status === 'SUSPENDED') return 'var(--danger)'
  return 'var(--text-3)'
}

const roleOptions: CommercialAccountRole[] = ['OWNER', 'ADMIN', 'BILLING', 'SUPERVISOR', 'AGENT']
const statusOptions: CommercialMembershipStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED']

type PlatformAdministrationCache = {
  savedAt: string
  accounts: AdminCommercialAccount[]
  users: AdminUser[]
  members: AccountMembership[]
  selectedAccountId?: number
  stats: {
    accounts: number
    users: number
    memberships: number
    activeAccounts: number
    platformAdmins: number
    customerAdmins: number
  }
}

const emptyStats = { accounts: 0, users: 0, memberships: 0, activeAccounts: 0, platformAdmins: 0, customerAdmins: 0 }

const readCache = (): PlatformAdministrationCache | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) as PlatformAdministrationCache : null
  } catch {
    return null
  }
}

const writeCache = (cache: Omit<PlatformAdministrationCache, 'savedAt'>) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...cache, savedAt: new Date().toISOString() }))
  } catch {
    // Local cache is best-effort; administration APIs remain the source of truth.
  }
}

function AccountCard({ account, selected, onSelect }: { account: AdminCommercialAccount; selected: boolean; onSelect: () => void }) {
  const subscription = account.subscriptions?.[0]
  return (
    <button
      type="button"
      onClick={onSelect}
      className="glass"
      style={{
        ...card,
        textAlign: 'left',
        borderColor: selected ? 'rgba(251,11,140,.42)' : 'var(--border)',
        boxShadow: selected ? '0 18px 34px rgba(251,11,140,.14)' : undefined,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <div className="mono" style={{ color: 'var(--text-3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{account.code}</div>
          <h3 style={{ margin: '6px 0 5px', fontSize: 17, fontWeight: 900, color: 'var(--text)' }}>{account.name}</h3>
          <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 12 }}>{subscription?.plan?.name || 'No active plan'} · {money(account.wallet?.availableBalance, account.currency)}</p>
        </div>
        <span className="ptdt-chip" style={{ color: statusColor(account.status) }}>{account.status}</span>
      </div>
    </button>
  )
}

function PermissionToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800, color: 'var(--text-2)' }}>
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
      {label}
    </label>
  )
}

export default function PlatformAdministration() {
  const cached = useMemo(() => readCache(), [])
  const [accounts, setAccounts] = useState<AdminCommercialAccount[]>(cached?.accounts ?? [])
  const [users, setUsers] = useState<AdminUser[]>(cached?.users ?? [])
  const [members, setMembers] = useState<AccountMembership[]>(cached?.members ?? [])
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>(cached?.selectedAccountId)
  const [loading, setLoading] = useState(!cached?.accounts.length)
  const [refreshing, setRefreshing] = useState(Boolean(cached?.accounts.length))
  const hasVisibleDataRef = useRef(Boolean(cached?.accounts.length))
  const [saving, setSaving] = useState(false)
  const [pendingMembershipId, setPendingMembershipId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [message, setMessage] = useState('')
  const [stats, setStats] = useState(cached?.stats ?? emptyStats)
  const [memberForm, setMemberForm] = useState({
    userId: '',
    accountRole: 'OWNER' as CommercialAccountRole,
    status: 'ACTIVE' as CommercialMembershipStatus,
    canManageUsers: true,
    canManageBilling: true,
    canManageCampaigns: true,
    canViewReports: true,
    canUseDynamicCallerId: true,
    notes: '',
  })

  const selectedAccount = useMemo(() => accounts.find(account => account.id === selectedAccountId) || accounts[0], [accounts, selectedAccountId])

  const loadMembers = useCallback(async (accountId: number) => {
    const nextMembers = await administrationApi.listPlatformAccountMembers(accountId)
    setMembers(nextMembers)
    writeCache({ accounts, users, members: nextMembers, selectedAccountId: accountId, stats })
    return nextMembers
  }, [accounts, users, stats])

  const loadData = useCallback(async (accountId?: number, options: { silent?: boolean } = {}) => {
    if (options.silent || hasVisibleDataRef.current) setRefreshing(true)
    else setLoading(true)
    setError('')
    setWarning('')
    setMessage('')
    try {
      const overview = await administrationApi.getPlatformOverview()
      const resolvedAccountId = accountId || overview.accounts[0]?.id
      let nextMembers: AccountMembership[] = []
      if (resolvedAccountId) {
        nextMembers = await administrationApi.listPlatformAccountMembers(resolvedAccountId)
      }
      setAccounts(overview.accounts)
      setUsers(overview.users)
      setStats(overview.stats)
      setMembers(nextMembers)
      setSelectedAccountId(resolvedAccountId)
      writeCache({
        accounts: overview.accounts,
        users: overview.users,
        members: nextMembers,
        selectedAccountId: resolvedAccountId,
        stats: overview.stats,
      })
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Failed to load platform administration'
      if (hasVisibleDataRef.current) setWarning(`Showing cached administration data. ${detail}`)
      else setError(detail)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { void loadData(cached?.selectedAccountId, { silent: Boolean(cached?.accounts.length) }) }, [cached?.accounts.length, cached?.selectedAccountId, loadData])

  useEffect(() => {
    hasVisibleDataRef.current = accounts.length > 0
  }, [accounts.length])

  const handleSelectAccount = (accountId: number) => {
    setSelectedAccountId(accountId)
    setError('')
    setMessage('')
    void loadMembers(accountId).catch(err => setError(err instanceof Error ? err.message : 'Failed to load members'))
  }

  const handleAddMember = (event: FormEvent) => {
    event.preventDefault()
    if (!selectedAccount) return
    setSaving(true)
    setError('')
    setMessage('')
    void administrationApi.addPlatformAccountMember(selectedAccount.id, {
      userId: Number(memberForm.userId),
      accountRole: memberForm.accountRole,
      status: memberForm.status,
      canManageUsers: memberForm.canManageUsers,
      canManageBilling: memberForm.canManageBilling,
      canManageCampaigns: memberForm.canManageCampaigns,
      canViewReports: memberForm.canViewReports,
      canUseDynamicCallerId: memberForm.canUseDynamicCallerId,
      notes: memberForm.notes || null,
    }).then(membership => {
      const nextMembers = [membership, ...members.filter(item => item.id !== membership.id && item.userId !== membership.userId)]
      setMembers(nextMembers)
      writeCache({ accounts, users, members: nextMembers, selectedAccountId: selectedAccount.id, stats })
      setMessage('Account membership assigned.')
      setMemberForm(prev => ({ ...prev, userId: '', notes: '' }))
    }).catch(err => {
      setError(err instanceof Error ? err.message : 'Failed to assign account member')
    }).finally(() => setSaving(false))
  }

  const handleStatus = (membership: AccountMembership, status: CommercialMembershipStatus) => {
    const previousMembers = members
    const optimisticMembers = members.map(item => item.id === membership.id ? { ...item, status } : item)
    setMembers(optimisticMembers)
    writeCache({ accounts, users, members: optimisticMembers, selectedAccountId, stats })
    setSaving(true)
    setPendingMembershipId(membership.id)
    setError('')
    setMessage('')
    void administrationApi.updatePlatformMembership(membership.id, { status })
      .then(updated => {
        const nextMembers = optimisticMembers.map(item => item.id === updated.id ? updated : item)
        setMembers(nextMembers)
        writeCache({ accounts, users, members: nextMembers, selectedAccountId, stats })
        setMessage(`Membership marked ${status}.`)
      })
      .catch(err => {
        setMembers(previousMembers)
        writeCache({ accounts, users, members: previousMembers, selectedAccountId, stats })
        setError(err instanceof Error ? err.message : 'Failed to update membership')
      })
      .finally(() => {
        setSaving(false)
        setPendingMembershipId(null)
      })
  }

  return (
    <div className="ptdt-page">
      <div className="ptdt-page-header">
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 12 }}><Crown size={12} /> PTDT Platform Control</div>
          <h1 className="ptdt-page-title">Administration <span className="gradient-brand-text">Structure</span></h1>
          <p className="ptdt-page-desc">Separate PTDT platform control from customer-owned operations. Assign users to commercial accounts without giving customers Super Admin access.</p>
        </div>
        <div className="ptdt-toolbar">
          {refreshing && <span className="ptdt-chip">Refreshing...</span>}
          <button type="button" className="ptdt-action-btn" onClick={() => void loadData(selectedAccount?.id)} disabled={loading || refreshing || saving}><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>

      {error && <div className="glass" style={{ padding: 14, marginBottom: 14, color: 'var(--danger)', borderColor: 'rgba(239,68,68,.26)' }}>{error}</div>}
      {warning && <div className="glass" style={{ padding: 14, marginBottom: 14, color: 'var(--orange)', borderColor: 'rgba(240,185,11,.26)' }}>{warning}</div>}
      {message && <div className="glass" style={{ padding: 14, marginBottom: 14, color: 'var(--green-2)', borderColor: 'rgba(0,167,71,.24)' }}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
        {[
          ['Accounts', stats.accounts], ['Active Accounts', stats.activeAccounts], ['Users', stats.users], ['Memberships', stats.memberships], ['Platform Admins', stats.platformAdmins], ['Customer Admins', stats.customerAdmins],
        ].map(([label, value]) => (
          <div className="glass" style={card} key={String(label)}>
            <div className="mono" style={{ color: 'var(--text-3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 950, color: 'var(--text)', marginTop: 6 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 380px) 1fr', gap: 18, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div className="eyebrow green"><Building2 size={12} /> Commercial Accounts</div>
          {loading ? <div className="glass" style={card}>Loading accounts...</div> : accounts.map(account => (
            <AccountCard key={account.id} account={account} selected={account.id === selectedAccount?.id} onSelect={() => handleSelectAccount(account.id)} />
          ))}
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <div className="glass" style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div className="eyebrow pink"><Users size={12} /> Account Members</div>
                <h2 style={{ margin: '8px 0 4px', fontSize: 22, fontWeight: 950 }}>{selectedAccount?.name || 'Select account'}</h2>
                <p style={{ margin: 0, color: 'var(--text-3)' }}>Customer Admins, Supervisors, Billing users, and Agents belong here — not inside PTDT Super Admin.</p>
              </div>
              <span className="ptdt-chip">{members.length} members</span>
            </div>

            <form onSubmit={handleAddMember} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
              <select className="ptdt-select" required value={memberForm.userId} onChange={event => setMemberForm({ ...memberForm, userId: event.target.value })}>
                <option value="">Select user</option>
                {users.map(user => <option key={user.id} value={user.id}>{user.name} — {user.email} ({user.role})</option>)}
              </select>
              <select className="ptdt-select" value={memberForm.accountRole} onChange={event => setMemberForm({ ...memberForm, accountRole: event.target.value as CommercialAccountRole })}>
                {roleOptions.map(role => <option key={role} value={role}>{role}</option>)}
              </select>
              <select className="ptdt-select" value={memberForm.status} onChange={event => setMemberForm({ ...memberForm, status: event.target.value as CommercialMembershipStatus })}>
                {statusOptions.map(status => <option key={status} value={status}>{status}</option>)}
              </select>
              <input className="ptdt-input" value={memberForm.notes} onChange={event => setMemberForm({ ...memberForm, notes: event.target.value })} placeholder="Internal notes" />
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                <PermissionToggle label="Manage users" checked={memberForm.canManageUsers} onChange={checked => setMemberForm({ ...memberForm, canManageUsers: checked })} />
                <PermissionToggle label="Manage billing" checked={memberForm.canManageBilling} onChange={checked => setMemberForm({ ...memberForm, canManageBilling: checked })} />
                <PermissionToggle label="Manage campaigns" checked={memberForm.canManageCampaigns} onChange={checked => setMemberForm({ ...memberForm, canManageCampaigns: checked })} />
                <PermissionToggle label="View reports" checked={memberForm.canViewReports} onChange={checked => setMemberForm({ ...memberForm, canViewReports: checked })} />
                <PermissionToggle label="Dynamic caller ID" checked={memberForm.canUseDynamicCallerId} onChange={checked => setMemberForm({ ...memberForm, canUseDynamicCallerId: checked })} />
              </div>
              <button className="btn-brand" type="submit" disabled={saving || !selectedAccount}><UserPlus size={14} /> Assign Member</button>
            </form>

            <div style={{ overflowX: 'auto' }}>
              <table className="ptdt-table" style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse' }}>
                <thead><tr>{['User', 'Platform Role', 'Account Role', 'Status', 'Permissions', 'Actions'].map(label => <th key={label} style={{ textAlign: 'left', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>{label}</th>)}</tr></thead>
                <tbody>
                  {members.length === 0 ? <tr><td colSpan={6} style={{ padding: 24, color: 'var(--text-3)' }}>No users assigned to this commercial account yet.</td></tr> : members.map(member => (
                    <tr key={member.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 14px' }}><strong>{member.user?.name || `User #${member.userId}`}</strong><br/><span className="mono" style={{ color: 'var(--text-3)', fontSize: 11 }}>{member.user?.email || '—'}</span></td>
                      <td style={{ padding: '12px 14px' }}><span className="ptdt-chip">{member.user?.role || '—'}</span></td>
                      <td style={{ padding: '12px 14px', fontWeight: 900 }}>{member.accountRole}</td>
                      <td style={{ padding: '12px 14px', color: statusColor(member.status), fontWeight: 900 }}>{member.status}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-3)', fontSize: 12 }}>{[
                        member.canManageUsers ? 'Users' : '',
                        member.canManageBilling ? 'Billing' : '',
                        member.canManageCampaigns ? 'Campaigns' : '',
                        member.canViewReports ? 'Reports' : '',
                        member.canUseDynamicCallerId ? 'Caller ID' : '',
                      ].filter(Boolean).join(' · ') || 'Limited'}</td>
                      <td style={{ padding: '12px 14px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {member.status !== 'ACTIVE' && <button className="ptdt-action-btn active" type="button" disabled={pendingMembershipId === member.id} onClick={() => handleStatus(member, 'ACTIVE')}><ShieldCheck size={14}/> {pendingMembershipId === member.id ? 'Saving...' : 'Active'}</button>}
                        {member.status !== 'SUSPENDED' && <button className="ptdt-action-btn danger" type="button" disabled={pendingMembershipId === member.id} onClick={() => handleStatus(member, 'SUSPENDED')}>{pendingMembershipId === member.id ? 'Saving...' : 'Suspend'}</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass" style={{ ...card, borderColor: 'rgba(251,11,140,.22)' }}>
            <div className="eyebrow pink"><Crown size={12} /> Operating Rule</div>
            <p style={{ margin: '10px 0 0', color: 'var(--text-2)', lineHeight: 1.7 }}>
              PTDT Super Admin controls all customers, plans, wallet top-ups, add-ons, caller ID approval, and system-level settings. Customer Admins only control their assigned commercial account and cannot add balance or activate paid add-ons unless PTDT approves it.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
