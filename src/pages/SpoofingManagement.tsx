import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { PhoneCall, Plus, RefreshCw, ShieldCheck } from 'lucide-react'
import { dynamicCallerIdApi, type DynamicCallerIdRecord, type DynamicCallerIdStatus } from '../api/dynamicCallerId.api'
import { useAuthStore } from '../store/auth.store'

const emptyForm = { displayNumber: '', displayName: '', provider: 'illyvoip', accountId: '', notes: '' }
const statusOptions: DynamicCallerIdStatus[] = ['PENDING', 'VERIFIED', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'REJECTED']

const statusColor = (status: string) => {
  if (status === 'ACTIVE' || status === 'VERIFIED') return 'var(--green-2)'
  if (status === 'PENDING') return 'var(--orange)'
  if (status === 'REJECTED' || status === 'SUSPENDED') return 'var(--danger)'
  return 'var(--text-3)'
}

export default function SpoofingManagement() {
  const user = useAuthStore(state => state.user)
  const isPlatformAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'
  const [records, setRecords] = useState<DynamicCallerIdRecord[]>([])
  const [summary, setSummary] = useState<{ addonActive?: boolean; availableNumbers?: DynamicCallerIdRecord[]; account?: { name: string; code: string } } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const activeCount = useMemo(() => records.filter(item => item.isUsable).length, [records])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const nextSummary = await dynamicCallerIdApi.getSummary(isPlatformAdmin && form.accountId ? form.accountId : undefined).catch(() => null)
      const nextRecords = await dynamicCallerIdApi.list(isPlatformAdmin && form.accountId ? form.accountId : undefined)
      setSummary(nextSummary)
      setRecords(nextRecords)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Dynamic Caller ID data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadData() }, [])

  const submitRequest = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      if (isPlatformAdmin && form.accountId) {
        await dynamicCallerIdApi.adminCreate({ ...form, accountId: form.accountId, status: 'ACTIVE' })
        setMessage('Dynamic Caller ID added and activated for the selected customer account.')
      } else {
        await dynamicCallerIdApi.request(form)
        setMessage('Dynamic Caller ID request submitted. PTDT Super Admin must approve/activate it before use.')
      }
      setForm(emptyForm)
      setShowForm(false)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit Dynamic Caller ID')
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (record: DynamicCallerIdRecord, status: DynamicCallerIdStatus) => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await dynamicCallerIdApi.setStatus(record.id, status)
      setMessage(`Caller ID ${record.displayNumber} marked ${status}.`)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update Dynamic Caller ID status')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="ptdt-page">
      <div className="ptdt-page-header">
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 12 }}><PhoneCall size={12} /> Commercial Add-on</div>
          <h1 className="ptdt-page-title">Dynamic <span className="gradient-brand-text">Caller ID</span></h1>
          <p className="ptdt-page-desc">Customer-requested, PTDT-approved caller ID pool. Only ACTIVE + VERIFIED numbers can be used for outbound calls.</p>
        </div>
        <div className="ptdt-toolbar">
          <button type="button" className="ptdt-action-btn" onClick={() => void loadData()} disabled={loading || saving}><RefreshCw size={14} /> Refresh</button>
          <button type="button" className="btn-brand" onClick={() => setShowForm(value => !value)} style={{ minHeight: 38, fontSize: 12 }}><Plus size={14} /> {showForm ? 'Cancel' : isPlatformAdmin ? 'Add / Activate Caller ID' : 'Request Caller ID'}</button>
        </div>
      </div>

      {error && <div className="glass" style={{ color: 'var(--danger)', marginBottom: 14, padding: 14, borderColor: 'rgba(239,68,68,.28)' }}>{error}</div>}
      {message && <div className="glass" style={{ color: 'var(--green-2)', marginBottom: 14, padding: 14, borderColor: 'rgba(0,167,71,.24)' }}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
        <div className="glass" style={{ padding: 18 }}><div className="eyebrow green">Add-on</div><h2 style={{ margin: '8px 0', color: summary?.addonActive ? 'var(--green-2)' : 'var(--danger)' }}>{summary?.addonActive ? 'ACTIVE' : 'INACTIVE'}</h2><p style={{ margin: 0, color: 'var(--text-3)' }}>{summary?.account ? `${summary.account.name} (${summary.account.code})` : 'Commercial account scope'}</p></div>
        <div className="glass" style={{ padding: 18 }}><div className="eyebrow pink">Usable Caller IDs</div><h2 style={{ margin: '8px 0' }}>{activeCount}</h2><p style={{ margin: 0, color: 'var(--text-3)' }}>ACTIVE + VERIFIED only</p></div>
        <div className="glass" style={{ padding: 18 }}><div className="eyebrow purple">Control</div><h2 style={{ margin: '8px 0' }}>{isPlatformAdmin ? 'PTDT Admin' : 'Customer Request'}</h2><p style={{ margin: 0, color: 'var(--text-3)' }}>{isPlatformAdmin ? 'Approve, activate, suspend, reject.' : 'Submit request; PTDT approves.'}</p></div>
      </div>

      {showForm && (
        <form onSubmit={submitRequest} className="glass" style={{ padding: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 18 }}>
          {isPlatformAdmin && <input className="ptdt-input" value={form.accountId} onChange={e => setForm({ ...form, accountId: e.target.value })} placeholder="Commercial Account ID" required />}
          <input className="ptdt-input" value={form.displayNumber} onChange={e => setForm({ ...form, displayNumber: e.target.value })} placeholder="E.164 number, e.g. +14155552671" required />
          <input className="ptdt-input" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} placeholder="Display label" />
          <input className="ptdt-input" value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} placeholder="Provider, e.g. illivoip" />
          <input className="ptdt-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Verification notes" />
          <button type="submit" className="btn-brand" disabled={saving}>{saving ? 'Saving...' : isPlatformAdmin ? 'Add & Activate' : 'Submit Request'}</button>
        </form>
      )}

      <div className="glass" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="ptdt-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
            <thead><tr style={{ background: 'var(--bg-glass)' }}>{['Number', 'Label', 'Account', 'Provider', 'Status', 'Usable', 'Actions'].map(h => <th key={h} style={{ padding: '13px 16px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} style={{ padding: 30, color: 'var(--text-3)' }}>Loading Dynamic Caller IDs...</td></tr> : records.length === 0 ? <tr><td colSpan={7} style={{ padding: 30, color: 'var(--text-3)' }}>No Dynamic Caller IDs configured yet.</td></tr> : records.map(record => (
                <tr className="table-row" key={record.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="mono" style={{ padding: '13px 16px', fontWeight: 900 }}>{record.displayNumber}</td>
                  <td style={{ padding: '13px 16px' }}>{record.displayName || '—'}</td>
                  <td style={{ padding: '13px 16px' }}>{record.commercialAccountId ? `#${record.commercialAccountId}` : '—'}</td>
                  <td style={{ padding: '13px 16px' }}>{record.provider || 'dynamic-caller-id'}</td>
                  <td style={{ padding: '13px 16px' }}><span className="badge" style={{ color: statusColor(record.approvalStatus), border: `1px solid ${statusColor(record.approvalStatus)}` }}>{record.approvalStatus}</span></td>
                  <td style={{ padding: '13px 16px' }}>{record.isUsable ? <span className="badge badge-answered">YES</span> : <span className="badge badge-pending">NO</span>}</td>
                  <td style={{ padding: '13px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {isPlatformAdmin ? statusOptions.map(status => <button key={status} className={`ptdt-action-btn ${status === 'ACTIVE' ? 'active' : status === 'REJECTED' || status === 'SUSPENDED' ? 'danger' : ''}`} type="button" disabled={saving || record.approvalStatus === status} onClick={() => void updateStatus(record, status)}>{status === 'ACTIVE' ? <ShieldCheck size={14} /> : null}{status}</button>) : 'PTDT approval required'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
