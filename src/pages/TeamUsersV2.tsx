import { useMemo, useState } from 'react'
import { Plus, ShieldCheck, Users, X } from 'lucide-react'
import { useAgents } from '../hooks/useAgents'
import { agentsAPI } from '../api/agents.api'
import { useAuthStore } from '../store/auth.store'
import PtdtDialog, { type PtdtDialogState } from '../components/PtdtDialog'
import PtdtBusyOverlay from '../components/PtdtBusyOverlay'

const pink = '#fb0b8c'
const green = '#00a747'
const red = '#ef4444'

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

const switchKnob: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: '50%',
  background: '#fff',
  boxShadow: '0 4px 10px rgba(15,23,42,.22)',
}

const roleLabel = (role: unknown) => {
  if (role === 'CUSTOMER_ADMIN') return 'Customer Admin'
  if (role === 'MANAGER') return 'Manager'
  if (role === 'SUPERVISOR') return 'Supervisor'
  return 'Agent'
}

export default function TeamUsersV2() {
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
  const [busy, setBusy] = useState(false)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<Record<string, unknown> | null>(null)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'AGENT', extension: '', phone: '' })

  const { agents, loading, createAgent, refetch } = useAgents({ isActive: showInactive ? undefined : true })
  const errorMessage = (err: unknown) => (err as { response?: { data?: { message?: string } } })?.response?.data?.message || (err as Error)?.message || 'Something went wrong'

  const withBusy = async (task: () => Promise<void>) => {
    setBusy(true)
    try { await task() } finally { setBusy(false); setPendingId(null) }
  }

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault()
    await withBusy(async () => {
      try {
        await createAgent(form as never)
        setForm({ name: '', email: '', password: '', role: 'AGENT', extension: '', phone: '' })
        setShowForm(false)
        setDialog({ tone: 'success', title: 'Team user created', message: 'The user has been created successfully.' })
      } catch (err) {
        setDialog({ tone: 'error', title: 'Cannot create user', message: errorMessage(err) })
      }
    })
  }

  const setUserActive = async (user: Record<string, unknown>, active: boolean) => {
    const id = Number(user.id)
    setPendingId(id)
    await withBusy(async () => {
      try { await agentsAPI.setActive(id, active); await refetch() }
      catch (err) { setDialog({ tone: 'error', title: 'Cannot update user', message: errorMessage(err) }) }
    })
  }

  const startRemove = (user: Record<string, unknown>) => {
    setConfirmEmail('')
    setRemoveTarget(user)
  }

  const finishRemove = async () => {
    if (!removeTarget) return
    const email = String(removeTarget.email || '')
    if (confirmEmail !== email) {
      setDialog({ tone: 'error', title: 'Confirmation mismatch', message: 'Please type the exact email address to continue.' })
      return
    }
    await withBusy(async () => {
      try {
        await agentsAPI.finalRemove(Number(removeTarget.id))
        setRemoveTarget(null)
        await refetch()
        setDialog({ tone: 'success', title: 'User removed', message: 'The test/orphan user has been removed.' })
      } catch (err) {
        setDialog({ tone: 'error', title: 'Cannot remove user', message: errorMessage(err) })
      }
    })
  }

  return (
    <div className="ptdt-page">
      <PtdtBusyOverlay active={busy} label="Applying team user changes..." />
      <PtdtDialog dialog={dialog} onClose={() => setDialog(null)} />

      <div className="ptdt-page-header">
        <div>
          <div className="eyebrow pink"><Users size={12} /> PTDT-Dialer Access</div>
          <h1 className="ptdt-page-title">Team <span className="gradient-brand-text">Users</span></h1>
          <p className="ptdt-page-desc">Create and manage users for the selected customer account scope.</p>
        </div>
        <button className="btn-brand" type="button" onClick={() => setShowForm(prev => !prev)}>
          {showForm ? <X size={15} /> : <Plus size={15} />} {showForm ? 'Cancel' : 'New Customer User'}
        </button>
      </div>

      {removeTarget && (
        <div className="glass" style={{ padding: 18, marginBottom: 18, borderColor: 'rgba(239,68,68,.40)' }}>
          <div className="eyebrow pink">Danger Zone</div>
          <h3 style={{ margin: '8px 0', color: red }}>Permanent user removal</h3>
          <p style={{ color: 'var(--text-2)' }}>Type <strong>{String(removeTarget.email)}</strong> to confirm this final action.</p>
          <input className="ptdt-input" value={confirmEmail} onChange={event => setConfirmEmail(event.target.value)} placeholder="Exact email" />
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="ptdt-action-btn" type="button" onClick={() => setRemoveTarget(null)}>Cancel</button>
            <button className="ptdt-action-btn danger" type="button" disabled={confirmEmail !== String(removeTarget.email)} onClick={() => void finishRemove()}>Remove user</button>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={createUser} className="glass" style={{ padding: 24, marginBottom: 18 }}>
          <h3 style={{ marginTop: 0 }}>New Customer User</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {[
              ['name', 'Full Name', 'text'],
              ['email', 'Email', 'email'],
              ['password', 'Password', 'password'],
              ['extension', 'Extension', 'text'],
              ['phone', 'Phone', 'text'],
            ].map(([key, label, type]) => <input key={key} type={type} placeholder={label} value={(form as Record<string, string>)[key]} onChange={event => setForm(prev => ({ ...prev, [key]: event.target.value }))} required={['name', 'email', 'password'].includes(key)} style={inputStyle} />)}
            <select value={form.role} onChange={event => setForm(prev => ({ ...prev, role: event.target.value }))} style={inputStyle}>
              {roleOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <button className="btn-brand" style={{ marginTop: 14 }} type="submit">Create User</button>
        </form>
      )}

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--text-2)', fontWeight: 800 }}>
        <input type="checkbox" checked={showInactive} onChange={event => setShowInactive(event.target.checked)} /> Show inactive users
      </label>

      <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
          <thead><tr>{['User', 'Email', 'Role', 'Status', 'Active', 'Actions'].map(label => <th key={label} style={{ textAlign: 'left', padding: 14, borderBottom: '1px solid var(--border)' }}>{label}</th>)}</tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} style={{ padding: 28, color: 'var(--text-3)' }}>Loading users...</td></tr> : agents.length === 0 ? <tr><td colSpan={6} style={{ padding: 28, color: 'var(--text-3)' }}>No team users found</td></tr> : agents.map(user => {
              const isSelf = Number(user.id) === Number(currentUser?.id)
              const active = Boolean(user.isActive)
              const statusStyle = active ? { color: green, bg: 'rgba(0,167,71,.10)' } : { color: 'var(--text-3)', bg: 'var(--bg-2)' }
              return <tr key={Number(user.id)} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: 14, fontWeight: 900 }}>{String(user.name || '—')}<br /><span className="mono" style={{ color: 'var(--text-3)', fontSize: 11 }}>{String(user.agentCode || '')}</span></td>
                <td style={{ padding: 14 }}>{String(user.email || '—')}</td>
                <td style={{ padding: 14 }}>{roleLabel(user.role)}</td>
                <td style={{ padding: 14 }}><span className="badge" style={{ color: statusStyle.color, background: statusStyle.bg, border: `1px solid ${statusStyle.color}` }}>{String(user.status)}</span></td>
                <td style={{ padding: 14 }}>{isSelf ? <span className="badge" style={{ color: green, background: 'rgba(0,167,71,.10)', border: '1px solid rgba(0,167,71,.28)' }}><ShieldCheck size={13} /> Signed in</span> : <button type="button" role="switch" aria-checked={active} disabled={pendingId === Number(user.id)} onClick={() => void setUserActive(user, !active)} style={switchBox(active, pendingId === Number(user.id))}><span style={switchKnob} /></button>}</td>
                <td style={{ padding: 14 }}>{isPlatformAdmin && !isSelf ? <button type="button" className="ptdt-action-btn danger" onClick={() => startRemove(user)}>Remove</button> : '—'}</td>
              </tr>
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
