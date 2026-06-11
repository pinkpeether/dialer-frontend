import { useMemo, useState } from 'react'
import { Plus, Search, ShieldCheck, UserX, Users, X } from 'lucide-react'
import { useAgents } from '../hooks/useAgents'
import { useAuthStore } from '../store/auth.store'
import PtdtDialog, { type PtdtDialogState } from '../components/PtdtDialog'
import StatsCard from '../components/StatsCard'

const COL_PINK = '#fb0b8c'
const COL_GREEN = '#00a747'
const COL_PURPLE = '#8057d7'
const COL_GOLD = '#f0b90b'
const COL_DANGER = '#ef4444'

const ROLE_LABELS: Record<string, string> = {
  CUSTOMER_ADMIN: 'Customer Admin',
  MANAGER: 'Manager',
  SUPERVISOR: 'Supervisor',
  AGENT: 'Agent',
}

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  ONLINE: { color: COL_GREEN, bg: 'rgba(0,167,71,.10)' },
  READY: { color: COL_PURPLE, bg: 'rgba(128,87,215,.12)' },
  BUSY: { color: COL_GOLD, bg: 'rgba(240,185,11,.12)' },
  WRAP_UP: { color: COL_PINK, bg: 'rgba(251,11,140,.10)' },
  OFFLINE: { color: 'var(--text-3)', bg: 'var(--bg-2)' },
}

const inputStyle: React.CSSProperties = {
  padding: '11px 14px',
  background: 'var(--bg-glass-hi)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  fontSize: 13,
  outline: 'none',
  width: '100%',
}

const emptyStats = { total: 0, online: 0, ready: 0, busy: 0, offline: 0 }

export default function TeamUsers() {
  const currentUser = useAuthStore(state => state.user)
  const isPlatformAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN'
  const roleOptions = useMemo(() => {
    const base = [
      { value: 'AGENT', label: 'Agent' },
      { value: 'SUPERVISOR', label: 'Supervisor' },
      { value: 'MANAGER', label: 'Manager' },
    ]
    return isPlatformAdmin ? [...base, { value: 'CUSTOMER_ADMIN', label: 'Customer Admin' }] : base
  }, [isPlatformAdmin])

  const [dialog, setDialog] = useState<PtdtDialogState | null>(null)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'AGENT', extension: '', phone: '' })

  const { agents, stats, loading, createAgent, deleteAgent } = useAgents({ search: search || undefined, isActive: showInactive ? undefined : true })
  const visibleStats = stats || emptyStats
  const visibleAgents = agents.filter(agent => {
    if (!search) return true
    const q = search.toLowerCase()
    return String(agent.name || '').toLowerCase().includes(q) || String(agent.email || '').toLowerCase().includes(q) || String(agent.agentCode || '').toLowerCase().includes(q)
  })

  const errorMessage = (err: unknown) => (err as { response?: { data?: { message?: string } } })?.response?.data?.message || (err as Error)?.message || 'Something went wrong'

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      await createAgent(form as never)
      setShowForm(false)
      setForm({ name: '', email: '', password: '', role: 'AGENT', extension: '', phone: '' })
      setDialog({ tone: 'success', title: 'Team user created', message: 'The user is ready according to this account’s permissions.' })
    } catch (err) {
      setDialog({ tone: 'error', title: 'Cannot create user', message: errorMessage(err) })
    }
  }

  const askDeactivate = (agent: Record<string, unknown>) => {
    setDialog({
      tone: 'confirm',
      title: 'Deactivate team user?',
      message: `This will deactivate ${String(agent.name || 'this user')} and hide them from the active team list.`,
      confirmLabel: 'Deactivate',
      onConfirm: async () => {
        try {
          await deleteAgent(agent.id as number)
          setDialog({ tone: 'success', title: 'User deactivated', message: 'The user is now inactive.' })
        } catch (err) {
          setDialog({ tone: 'error', title: 'Cannot deactivate user', message: errorMessage(err) })
        }
      },
    })
  }

  return (
    <div className="ptdt-page">
      <PtdtDialog dialog={dialog} onClose={() => setDialog(null)} />

      <div className="ptdt-page-header">
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 12 }}><Users size={12} /> PTDT-Dialer Access</div>
          <h1 className="ptdt-page-title">Team <span className="gradient-brand-text">Users</span></h1>
          <p className="ptdt-page-desc">Create customer-side users, assign safe roles, and monitor availability.</p>
        </div>
        <button type="button" className="btn-brand" onClick={() => setShowForm(prev => !prev)} style={{ borderRadius: 'var(--radius-full)', padding: '0 22px', minHeight: 46 }}>
          {showForm ? <X size={15} /> : <Plus size={15} />} {showForm ? 'Cancel' : 'New Customer User'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total', value: Number(visibleStats.total), color: COL_PINK, bg: 'rgba(251,11,140,.10)' },
          { label: 'Online', value: Number(visibleStats.online), color: COL_GREEN, bg: 'rgba(0,167,71,.10)' },
          { label: 'Ready', value: Number(visibleStats.ready), color: COL_PURPLE, bg: 'rgba(128,87,215,.12)' },
          { label: 'Busy', value: Number(visibleStats.busy), color: COL_GOLD, bg: 'rgba(240,185,11,.12)' },
          { label: 'Offline', value: Number(visibleStats.offline), color: COL_PURPLE, bg: 'rgba(128,87,215,.12)' },
        ].map((item, index) => <StatsCard key={item.label} index={index} label={item.label} value={item.value} icon={<Users size={16} />} color={item.color} bg={item.bg} />)}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="glass" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 18px', color: 'var(--text)', fontSize: 18, fontWeight: 900 }}>New Customer User</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
            {[
              { key: 'name', placeholder: 'Full Name', type: 'text' },
              { key: 'email', placeholder: 'Email', type: 'email' },
              { key: 'password', placeholder: 'Password', type: 'password' },
              { key: 'extension', placeholder: 'Extension', type: 'text' },
              { key: 'phone', placeholder: 'Phone', type: 'text' },
            ].map(field => (
              <input key={field.key} type={field.type} placeholder={field.placeholder} value={(form as Record<string, string>)[field.key]} onChange={event => setForm(prev => ({ ...prev, [field.key]: event.target.value }))} required={['name', 'email', 'password'].includes(field.key)} style={inputStyle} />
            ))}
            <select value={form.role} onChange={event => setForm(prev => ({ ...prev, role: event.target.value }))} style={inputStyle}>
              {roleOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn-brand" style={{ borderRadius: 'var(--radius-md)', padding: '10px 22px', color: '#fff' }}>Create User</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 22px', color: 'var(--text-2)', fontWeight: 750 }}>Cancel</button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ position: 'relative', maxWidth: 340, flex: '1 1 260px' }}>
          <Search size={14} color="var(--text-3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search team users..." style={{ ...inputStyle, paddingLeft: 36 }} />
        </div>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-2)', fontSize: 13, fontWeight: 700 }}>
          <input type="checkbox" checked={showInactive} onChange={event => setShowInactive(event.target.checked)} /> Show inactive users
        </label>
      </div>

      <div className="glass" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr style={{ background: 'var(--bg-glass)' }}>
                {['#', 'User', 'Email', 'Role', 'Status', 'Actions'].map(header => <th key={header} style={{ padding: '13px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid var(--border)' }}>{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading && agents.length > 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>Loading team users…</td></tr>
              ) : visibleAgents.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No team users found</td></tr>
              ) : visibleAgents.map((agent, index) => {
                const statusStyle = STATUS_COLORS[String(agent.status)] || STATUS_COLORS.OFFLINE
                const isSelf = Number(agent.id) === Number(currentUser?.id)
                return (
                  <tr key={agent.id as number} className="table-row" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="mono" style={{ padding: '14px 16px', color: 'var(--text-3)', fontSize: 12 }}>{String(index + 1).padStart(2, '0')}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--grad-brand)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 900 }}>{String(agent.name || '?').charAt(0).toUpperCase()}</div>
                        <div><div style={{ color: 'var(--text)', fontWeight: 800 }}>{agent.name as string}</div><div className="mono" style={{ color: 'var(--text-3)', fontSize: 11 }}>{agent.agentCode as string}</div></div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-2)', fontSize: 13 }}>{agent.email as string}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-3)', fontWeight: 800, fontSize: 12 }}>{ROLE_LABELS[String(agent.role)] || String(agent.role)}</td>
                    <td style={{ padding: '14px 16px' }}><span className="badge" style={{ color: statusStyle.color, background: statusStyle.bg, border: `1px solid ${statusStyle.color}` }}>{agent.status as string}</span></td>
                    <td style={{ padding: '14px 16px' }}>
                      {isSelf ? <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: COL_GREEN, background: 'rgba(0,167,71,.10)', border: '1px solid rgba(0,167,71,.28)' }}><ShieldCheck size={13} /> Signed in</span> : <button type="button" onClick={() => askDeactivate(agent)} style={{ background: 'transparent', border: '1px solid rgba(239,68,68,.32)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', color: COL_DANGER, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 850 }}><UserX size={13} /> Deactivate</button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
