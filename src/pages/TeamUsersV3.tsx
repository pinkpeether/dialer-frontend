// PTDT Team Users V3
import { useMemo, useState } from 'react'
import { Pencil, Plus, Save, ShieldCheck, Users, X } from 'lucide-react'
import { useAgents } from '../hooks/useAgents'
import { agentsAPI } from '../api/agents.api'
import { useAuthStore } from '../store/auth.store'
import PtdtDialog, { type PtdtDialogState } from '../components/PtdtDialog'
import PtdtBusyOverlay from '../components/PtdtBusyOverlay'
import CustomerAccordionHeader, { customerAccordionBodyStyle } from '../components/CustomerAccordionHeader'
import { setGlobalRequestOverlaySuppressed } from '../api/axios'
import { mergeMasterCustomerGroups, useMasterCustomerAccounts } from '../hooks/useMasterCustomerAccounts'

const green = '#00a747'
const danger = '#ef4444'

type TeamUser = Record<string, unknown>
type CustomerGroup = { key: string; id: number | null; name: string; code: string; status: string; users: TeamUser[] }

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

const fieldLabelStyle: React.CSSProperties = {
  color: 'var(--text-2)',
  fontSize: 12,
  fontWeight: 900,
}

const requiredStar = <span style={{ color: danger }}> *</span>

const switchStyle = (active: boolean, pending: boolean): React.CSSProperties => ({
  width: 52,
  height: 26,
  borderRadius: 999,
  padding: 2,
  border: active ? '1px solid rgba(0,167,71,.62)' : '1px solid rgba(148,163,184,.52)',
  background: active ? 'linear-gradient(135deg,#13b85f,#08a64f)' : 'linear-gradient(135deg,#f3f4f6,#d9dce2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: active ? 'flex-end' : 'flex-start',
  cursor: pending ? 'progress' : 'pointer',
  opacity: pending ? 0.7 : 1,
})

const switchKnob: React.CSSProperties = {
  width: 20,
  height: 20,
  borderRadius: '50%',
  background: '#fff',
  boxShadow: '0 4px 10px rgba(15,23,42,.22)',
}

const teamUserColumnWidths = ['23%', '25%', '15%', '13%', '10%', '14%']

const roleLabel = (role: unknown) => {
  if (role === 'CUSTOMER_ADMIN') return 'Customer Admin'
  if (role === 'SUPERVISOR') return 'Supervisor'
  if (role === 'MANAGER') return 'Disabled Role'
  return 'Agent'
}

const accountForUser = (user: TeamUser) => {
  const direct = user.commercialAccount as Record<string, unknown> | null | undefined
  if (direct?.id || direct?.name) return direct
  const list = user.commercialAccounts as Record<string, unknown>[] | undefined
  return Array.isArray(list) && list.length ? list[0] : null
}

const groupUsersByCustomer = (users: TeamUser[]) => {
  const map = new Map<string, CustomerGroup>()
  users.forEach(user => {
    const account = accountForUser(user)
    const id = account?.id ? Number(account.id) : null
    const name = String(account?.name || 'PTDT Super Admin')
    const key = id ? `account-${id}` : 'account-unassigned'
    if (!map.has(key)) {
      map.set(key, { key, id, name, code: String(account?.code || '—'), status: String(account?.status || '—'), users: [] })
    }
    map.get(key)?.users.push(user)
  })
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export default function TeamUsersV3() {
  const currentUser = useAuthStore(state => state.user)
  const isPlatformAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN'
  const isSupervisor = currentUser?.role === 'SUPERVISOR'
  const roleOptions = useMemo(() => {
    if (isSupervisor) return [{ value: 'AGENT', label: 'Agent' }]
    const base = [{ value: 'AGENT', label: 'Agent' }, { value: 'SUPERVISOR', label: 'Supervisor' }]
    return isPlatformAdmin ? [...base, { value: 'CUSTOMER_ADMIN', label: 'Customer Admin' }] : base
  }, [isPlatformAdmin, isSupervisor])

  const [dialog, setDialog] = useState<PtdtDialogState | null>(null)
  const [busy, setBusy] = useState(false)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [finalTarget, setFinalTarget] = useState<Record<string, unknown> | null>(null)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [armedEmail, setArmedEmail] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'AGENT', extension: '', phone: '' })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  const { agents, loading, createAgent, refetch } = useAgents({ isActive: showInactive ? undefined : true, limit: 200 })
  const masterAccounts = useMasterCustomerAccounts()
  const groupedAccounts = useMemo(() => mergeMasterCustomerGroups(masterAccounts, groupUsersByCustomer(agents), 'users'), [agents, masterAccounts])
  const errorMessage = (err: unknown) => (err as { response?: { data?: { message?: string } } })?.response?.data?.message || (err as Error)?.message || 'Something went wrong'

  const withBusy = async (task: () => Promise<void>) => {
    setBusy(true)
    setGlobalRequestOverlaySuppressed(true)
    try { await task() }
    finally {
      setGlobalRequestOverlaySuppressed(false)
      setBusy(false)
      setPendingId(null)
    }
  }

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault()
    await withBusy(async () => {
      try {
        await createAgent((isSupervisor ? { ...form, role: 'AGENT' } : form) as never)
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

  const startEditUser = (user: Record<string, unknown>) => {
    setEditingId(Number(user.id))
    setEditingName(String(user.name || ''))
  }

  const cancelEditUser = () => { setEditingId(null); setEditingName('') }

  const saveEditUser = async (user: Record<string, unknown>) => {
    const id = Number(user.id)
    const nextName = editingName.trim()
    if (!nextName) {
      setDialog({ tone: 'error', title: 'Name required', message: 'Please enter a team user name.' })
      return
    }
    setPendingId(id)
    await withBusy(async () => {
      try {
        await agentsAPI.update(id, { name: nextName })
        cancelEditUser()
        await refetch()
        setDialog({ tone: 'success', title: 'Team user updated', message: 'The team user name has been updated successfully.' })
      } catch (err) {
        setDialog({ tone: 'error', title: 'Cannot update user', message: errorMessage(err) })
      }
    })
  }

  const finishFinalAction = async () => {
    if (!finalTarget) return
    const email = String(finalTarget.email || '')
    if (confirmEmail !== email) {
      setDialog({ tone: 'error', title: 'Confirmation mismatch', message: 'Please type the exact email address to continue.' })
      return
    }
    if (armedEmail !== email) {
      setArmedEmail(email)
      setDialog({ tone: 'confirm', title: 'Final confirmation required', message: 'Click Confirm cleanup one more time to complete this action.' })
      return
    }
    await withBusy(async () => {
      try {
        await agentsAPI.finalRemove(Number(finalTarget.id))
        setFinalTarget(null)
        setArmedEmail('')
        await refetch()
        setDialog({ tone: 'success', title: 'User cleared', message: 'The test/orphan user has been cleared.' })
      } catch (err) {
        setDialog({ tone: 'error', title: 'Cannot clear user', message: errorMessage(err) })
      }
    })
  }

  const toggleGroup = (key: string, currentlyOpen = false) => setExpandedGroups(prev => ({ ...prev, [key]: !currentlyOpen }))

  const renderUserRow = (user: TeamUser) => {
    const isSelf = Number(user.id) === Number(currentUser?.id)
    const active = Boolean(user.isActive)
    const canToggleActive = !isSelf && (!isSupervisor || user.role === 'AGENT')
    const statusStyle = active ? { color: green, bg: 'rgba(0,167,71,.10)' } : { color: 'var(--text-3)', bg: 'var(--bg-2)' }
    return <tr key={Number(user.id)} style={{ borderBottom: '1px solid var(--border)' }}>
      <td style={{ padding: 14, fontWeight: 900, fontSize: 16.8 }}>{editingId === Number(user.id) ? <input value={editingName} onChange={event => setEditingName(event.target.value)} style={{ ...inputStyle, maxWidth: 260, minHeight: 38 }} autoFocus /> : String(user.name || '—')}<br /><span className="mono" style={{ color: 'var(--text-3)', fontSize: 11 }}>{String(user.agentCode || '')}</span></td>
      <td style={{ padding: 14, fontSize: 16.8, fontWeight: 750 }}>{String(user.email || '—')}</td>
      <td style={{ padding: 14, fontSize: 16.8, fontWeight: 800 }}>{roleLabel(user.role)}</td>
      <td style={{ padding: 14 }}><span className="badge" style={{ color: statusStyle.color, background: statusStyle.bg, border: `1px solid ${statusStyle.color}`, fontSize: 11 }}>{String(user.status)}</span></td>
      <td style={{ padding: 14 }}>{isSelf ? <span className="badge" style={{ color: green, background: 'rgba(0,167,71,.10)', border: '1px solid rgba(0,167,71,.28)' }}><ShieldCheck size={13} /> Signed in</span> : canToggleActive ? <button type="button" role="switch" aria-checked={active} disabled={pendingId === Number(user.id)} onClick={() => void setUserActive(user, !active)} style={switchStyle(active, pendingId === Number(user.id))}><span style={switchKnob} /></button> : <span className="badge" style={{ color: 'var(--text-3)', background: 'var(--bg-2)', border: '1px solid var(--border)' }}>Protected</span>}</td>
      <td style={{ padding: 14 }}><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{editingId === Number(user.id) ? <><button type="button" className="ptdt-action-btn" disabled={pendingId === Number(user.id)} onClick={() => void saveEditUser(user)}><Save size={13} /> Save</button><button type="button" className="ptdt-action-btn" onClick={cancelEditUser}><X size={13} /> Cancel</button></> : !isSelf && (!isSupervisor || user.role === 'AGENT') ? <button type="button" className="ptdt-action-btn" onClick={() => startEditUser(user)}><Pencil size={13} /> Edit</button> : null}{isPlatformAdmin && !isSelf ? <button type="button" className="ptdt-action-btn danger" onClick={() => { setConfirmEmail(''); setArmedEmail(''); setFinalTarget(user) }}>Cleanup</button> : null}{isSelf || (isSupervisor && user.role !== 'AGENT') ? <span style={{ color: 'var(--text-3)' }}>—</span> : null}</div></td>
    </tr>
  }

  const tableHeader = <thead><tr>{['User', 'Email', 'Role', 'Status', 'Active', 'Actions'].map((label, index) => <th key={label} style={{ width: teamUserColumnWidths[index], textAlign: 'left', padding: 14, borderBottom: '1px solid var(--border)', fontSize: 15.5, fontWeight: 950, letterSpacing: 0.7, color: 'var(--text-2)' }}>{label}</th>)}</tr></thead>

  return (
    <div className="ptdt-page ptdt-team-users-page">
      <PtdtBusyOverlay active={busy} label="Applying team user changes..." />
      <PtdtDialog dialog={dialog} onClose={() => setDialog(null)} />

      <div className="ptdt-page-header"><div><div className="eyebrow pink"><Users size={12} /> PTDT-Dialer Access</div><h1 className="ptdt-page-title">Team <span className="gradient-brand-text">Users</span></h1><p className="ptdt-page-desc">Create and manage users for the selected customer account scope.</p></div><button className="btn-brand" type="button" onClick={() => setShowForm(prev => !prev)}>{showForm ? <X size={15} /> : <Plus size={15} />} {showForm ? 'Cancel' : 'New Team User'}</button></div>

      {finalTarget && <div className="glass" style={{ padding: 18, marginBottom: 18, borderColor: 'rgba(239,68,68,.40)' }}><div className="eyebrow pink">Danger Zone</div><h3 style={{ margin: '8px 0', color: danger }}>Final user cleanup</h3><p style={{ color: 'var(--text-2)' }}>Type <strong>{String(finalTarget.email)}</strong> to confirm this final action.</p><input className="ptdt-input" value={confirmEmail} onChange={event => { setArmedEmail(''); setConfirmEmail(event.target.value) }} placeholder="Exact email" /><div style={{ display: 'flex', gap: 10, marginTop: 12 }}><button className="ptdt-action-btn" type="button" onClick={() => setFinalTarget(null)}>Cancel</button><button className="ptdt-action-btn danger" type="button" disabled={confirmEmail !== String(finalTarget.email)} onClick={() => void finishFinalAction()}>{armedEmail === String(finalTarget.email || '') ? 'Final click to cleanup' : 'Confirm cleanup'}</button></div></div>}

      {showForm && <form onSubmit={createUser} className="glass" style={{ padding: 24, marginBottom: 18 }}><h3 style={{ marginTop: 0 }}>New Team User</h3><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>{[['name', 'Full Name', 'text', true], ['email', 'Email', 'email', true], ['password', 'Password', 'password', true], ['extension', 'Extension', 'text', false], ['phone', 'Phone', 'text', false]].map(([key, label, type, required]) => <label key={String(key)} style={{ display: 'grid', gap: 6 }}><span style={fieldLabelStyle}>{String(label)}{required ? requiredStar : null}</span><input type={String(type)} value={(form as Record<string, string>)[String(key)]} onChange={event => setForm(prev => ({ ...prev, [String(key)]: event.target.value }))} required={Boolean(required)} style={inputStyle} /></label>)}<label style={{ display: 'grid', gap: 6 }}><span style={fieldLabelStyle}>Role{requiredStar}</span><select required value={isSupervisor ? 'AGENT' : form.role} onChange={event => setForm(prev => ({ ...prev, role: event.target.value }))} style={inputStyle}>{roleOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>{isSupervisor && <p style={{ margin: '10px 0 0', color: 'var(--text-3)', fontSize: 12.5, fontWeight: 800 }}>Supervisor accounts can create Agent users only.</p>}<button className="btn-brand" style={{ marginTop: 14 }} type="submit">Create User</button></form>}

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--text-2)', fontWeight: 800 }}><input type="checkbox" checked={showInactive} onChange={event => setShowInactive(event.target.checked)} /> Show inactive users</label>

      {loading ? <div className="glass" style={{ padding: 28, color: 'var(--text-3)' }}>Loading users...</div> : isPlatformAdmin ? <div style={{ display: 'grid', gap: 12 }}>{groupedAccounts.map((group, index) => {
        const isOpen = expandedGroups[group.key] ?? index === 0
        const agentCount = group.users.filter(user => user.role === 'AGENT').length
        const supervisorCount = group.users.filter(user => user.role === 'SUPERVISOR').length
        const adminCount = group.users.filter(user => user.role === 'CUSTOMER_ADMIN').length
        return <div key={group.key} className="glass" style={{ overflow: 'hidden' }}><CustomerAccordionHeader isOpen={isOpen} onClick={() => toggleGroup(group.key, isOpen)} name={group.name} meta={`Customer Code: ${group.code} · Status: ${group.status}`} badges={[{ label: `${group.users.length} Users` }, { label: `${agentCount} Agents`, color: green, bg: 'rgba(0,167,71,.10)', border: '1px solid rgba(0,167,71,.28)' }, { label: `${supervisorCount} Supervisors`, color: 'var(--text-2)', bg: 'var(--bg-2)', border: '1px solid var(--border)' }, ...(adminCount > 0 ? [{ label: `${adminCount} Customer Admins`, color: 'var(--text-2)', bg: 'var(--bg-2)', border: '1px solid var(--border)' }] : [])]} />{isOpen && <div style={{ ...customerAccordionBodyStyle, overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '100%', tableLayout: 'fixed' }}>{tableHeader}<tbody>{group.users.map(renderUserRow)}</tbody></table></div>}</div>
      })}</div> : <div className="glass" style={{ padding: 0, overflow: 'hidden' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '100%', tableLayout: 'fixed' }}>{tableHeader}<tbody>{agents.map(renderUserRow)}</tbody></table></div>}
    </div>
  )
}
