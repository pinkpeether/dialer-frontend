// PTDT Platform Administration V2
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Building2, Crown, RefreshCw, UserPlus, Users } from 'lucide-react'
import { administrationApi, type AccountMembership, type AdminCommercialAccount, type AdminUser, type CommercialAccountRole } from '../api/administration.api'
import PtdtBusyOverlay from '../components/PtdtBusyOverlay'

const card = { padding: 18, borderRadius: 18 } as const
const platformRoles = new Set(['SUPER_ADMIN', 'ADMIN'])
const accountRoleOptions: CommercialAccountRole[] = ['OWNER', 'ADMIN', 'BILLING', 'SUPERVISOR', 'AGENT']

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
const switchDot: React.CSSProperties = { width: 26, height: 26, borderRadius: '50%', background: '#fff', boxShadow: '0 4px 10px rgba(15,23,42,.22)' }

const money = (value: unknown, currency = 'USD') => `${currency} ${Number(value || 0).toFixed(2)}`
const accountRoleLabel = (role: string) => role === 'ADMIN' ? 'Account Admin' : role

export default function PlatformAdministrationV2() {
  const [accounts, setAccounts] = useState<AdminCommercialAccount[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [members, setMembers] = useState<AccountMembership[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pendingMembershipId, setPendingMembershipId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({ userId: '', accountRole: 'OWNER' as CommercialAccountRole, canManageUsers: true, canManageBilling: true, canManageCampaigns: true, canViewReports: true, canUseDynamicCallerId: true })

  const selectedAccount = accounts.find(account => account.id === selectedAccountId) || accounts[0]

  const assignableUsers = useMemo(() => {
    const selectedId = selectedAccount?.id
    const selectedMemberIds = new Set(members.map(member => member.userId))
    const otherAccountMemberIds = new Set<number>()
    accounts.forEach(account => {
      if (account.id === selectedId) return
      account.memberships?.forEach(member => otherAccountMemberIds.add(member.userId))
    })
    return users.filter(user => {
      if (platformRoles.has(String(user.role).toUpperCase())) return false
      if (selectedMemberIds.has(user.id)) return true
      return !otherAccountMemberIds.has(user.id)
    })
  }, [accounts, members, selectedAccount?.id, users])

  const loadMembers = async (accountId: number) => {
    const nextMembers = await administrationApi.listPlatformAccountMembers(accountId)
    setMembers(nextMembers)
    return nextMembers
  }

  const loadData = async (accountId?: number) => {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const overview = await administrationApi.getPlatformOverview()
      const resolvedAccountId = accountId || overview.accounts[0]?.id
      setAccounts(overview.accounts)
      setUsers(overview.assignableCustomerUsers || overview.users)
      setSelectedAccountId(resolvedAccountId)
      if (resolvedAccountId) await loadMembers(resolvedAccountId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load platform administration')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadData() }, [])

  const selectAccount = (accountId: number) => {
    setSelectedAccountId(accountId)
    setMessage('')
    setError('')
    void loadMembers(accountId).catch(err => setError(err instanceof Error ? err.message : 'Failed to load members'))
  }

  const assignMember = (event: FormEvent) => {
    event.preventDefault()
    if (!selectedAccount) return
    setSaving(true)
    setError('')
    setMessage('')
    void administrationApi.addPlatformAccountMember(selectedAccount.id, { userId: Number(form.userId), accountRole: form.accountRole, status: 'ACTIVE', canManageUsers: form.canManageUsers, canManageBilling: form.canManageBilling, canManageCampaigns: form.canManageCampaigns, canViewReports: form.canViewReports, canUseDynamicCallerId: form.canUseDynamicCallerId })
      .then(async () => { await loadMembers(selectedAccount.id); setForm(prev => ({ ...prev, userId: '' })); setMessage('Account membership assigned.') })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to assign member'))
      .finally(() => setSaving(false))
  }

  const toggleMember = (member: AccountMembership) => {
    const nextStatus = member.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    setSaving(true)
    setPendingMembershipId(member.id)
    setError('')
    void administrationApi.updatePlatformMembership(member.id, { status: nextStatus })
      .then(async () => { if (selectedAccount) await loadMembers(selectedAccount.id); setMessage(`Membership marked ${nextStatus}.`) })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to update member'))
      .finally(() => { setSaving(false); setPendingMembershipId(null) })
  }

  return (
    <div className="ptdt-page">
      <PtdtBusyOverlay active={saving} label="Applying administration changes..." />
      <div className="ptdt-page-header">
        <div>
          <div className="eyebrow pink"><Crown size={12} /> PTDT Platform Control</div>
          <h1 className="ptdt-page-title">Administration <span className="gradient-brand-text">Structure</span></h1>
          <p className="ptdt-page-desc">Assign selected-account members. Dropdown shows only selected-account users and unassigned users.</p>
        </div>
        <button type="button" className="ptdt-action-btn" disabled={loading || saving} onClick={() => void loadData(selectedAccount?.id)}><RefreshCw size={14} /> Refresh</button>
      </div>

      {error && <div className="glass" style={{ padding: 14, marginBottom: 14, color: 'var(--danger)', borderColor: 'rgba(239,68,68,.26)' }}>{error}</div>}
      {message && <div className="glass" style={{ padding: 14, marginBottom: 14, color: 'var(--green-2)', borderColor: 'rgba(0,167,71,.24)' }}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px,380px) 1fr', gap: 18, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div className="eyebrow green"><Building2 size={12} /> Commercial Accounts</div>
          {loading ? <div className="glass" style={card}>Loading accounts...</div> : accounts.map(account => <button key={account.id} type="button" className="glass" onClick={() => selectAccount(account.id)} style={{ ...card, textAlign: 'left', borderColor: account.id === selectedAccount?.id ? 'rgba(251,11,140,.42)' : 'var(--border)', cursor: 'pointer' }}><div className="mono" style={{ color: 'var(--text-3)', fontSize: 10 }}>{account.code}</div><h3 style={{ margin: '6px 0', color: 'var(--text)' }}>{account.name}</h3><p style={{ margin: 0, color: 'var(--text-3)', fontSize: 12 }}>{account.subscriptions?.[0]?.plan?.name || 'No active plan'} · {money(account.wallet?.availableBalance, account.currency)}</p></button>)}
        </div>

        <div className="glass" style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
            <div><div className="eyebrow pink"><Users size={12} /> Account Members</div><h2 style={{ margin: '8px 0 4px' }}>{selectedAccount?.name || 'Select account'}</h2><p style={{ margin: 0, color: 'var(--text-3)' }}>Selected account users plus unassigned customer users only.</p></div>
            <span className="ptdt-chip">{members.length} members</span>
          </div>

          <form onSubmit={assignMember} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 18 }}>
            <select className="ptdt-select" required value={form.userId} onChange={event => setForm({ ...form, userId: event.target.value })}><option value="">Select user</option>{assignableUsers.map(user => <option key={user.id} value={user.id}>{user.name} — {user.email} ({user.role})</option>)}</select>
            <select className="ptdt-select" value={form.accountRole} onChange={event => setForm({ ...form, accountRole: event.target.value as CommercialAccountRole })}>{accountRoleOptions.map(role => <option key={role} value={role}>{accountRoleLabel(role)}</option>)}</select>
            <button className="btn-brand" type="submit" disabled={saving || !selectedAccount}><UserPlus size={14} /> Assign Member</button>
          </form>

          <div style={{ overflowX: 'auto' }}>
            <table className="ptdt-table" style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
              <thead><tr>{['User', 'Platform Role', 'Account Role', 'Status', 'Active'].map(label => <th key={label} style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid var(--border)' }}>{label}</th>)}</tr></thead>
              <tbody>{members.length === 0 ? <tr><td colSpan={5} style={{ padding: 24, color: 'var(--text-3)' }}>No users assigned to this commercial account yet.</td></tr> : members.map(member => { const active = member.status === 'ACTIVE'; return <tr key={member.id} style={{ borderBottom: '1px solid var(--border)' }}><td style={{ padding: 12 }}><strong>{member.user?.name || `User #${member.userId}`}</strong><br /><span className="mono" style={{ color: 'var(--text-3)', fontSize: 11 }}>{member.user?.email || '—'}</span></td><td style={{ padding: 12 }}><span className="ptdt-chip">{member.user?.role || '—'}</span></td><td style={{ padding: 12, fontWeight: 900 }}>{accountRoleLabel(member.accountRole)}</td><td style={{ padding: 12, color: active ? 'var(--green-2)' : 'var(--danger)', fontWeight: 900 }}>{member.status}</td><td style={{ padding: 12 }}><button type="button" role="switch" aria-checked={active} disabled={pendingMembershipId === member.id} onClick={() => toggleMember(member)} style={switchBox(active, pendingMembershipId === member.id)}><span style={switchDot} /></button></td></tr> })}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
