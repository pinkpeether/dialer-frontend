import { useEffect, useState, type FormEvent } from 'react'
import { PhoneCall, Plus, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react'
import { spoofingApi } from '../api/spoofing.api'
import type { CallerIdPayload, CallerIdRecord } from '../api/spoofing.api'

const emptyForm: CallerIdPayload = { displayNumber: '', displayName: '', provider: 'generic', providerRef: '', scope: 'all', userId: null, campaignId: null }

export default function SpoofingManagement() {
  const [numbers, setNumbers] = useState<CallerIdRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CallerIdPayload>(emptyForm)
  const [error, setError] = useState('')

  const loadData = async () => {
    setLoading(true); setError('')
    try { setNumbers(await spoofingApi.getAll()) }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to load caller IDs') }
    finally { setLoading(false) }
  }

  useEffect(() => { void loadData() }, [])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault(); setSaving(true); setError('')
    try { await spoofingApi.create(form); setForm(emptyForm); setShowForm(false); await loadData() }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to create caller ID') }
    finally { setSaving(false) }
  }
  const handleVerify = async (id: number) => { setError(''); try { await spoofingApi.verify(id); await loadData() } catch (err) { setError(err instanceof Error ? err.message : 'Failed to verify caller ID') } }
  const handleToggle = async (record: CallerIdRecord) => { setError(''); try { await spoofingApi.update(record.id, { isActive: !record.isActive }); await loadData() } catch (err) { setError(err instanceof Error ? err.message : 'Failed to update caller ID') } }
  const handleDelete = async (id: number) => { if (!window.confirm('Delete this caller ID?')) return; setError(''); try { await spoofingApi.delete(id); await loadData() } catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete caller ID') } }

  return (
    <div className="ptdt-page">
      <div className="ptdt-page-header">
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 12 }}><PhoneCall size={12} /> Admin</div>
          <h1 className="ptdt-page-title">Caller ID <span className="gradient-brand-text">Management</span></h1>
          <p className="ptdt-page-desc">Manage approved outbound caller IDs for global, campaign, or user scope. Carrier/SIP-provider support is still required for actual outbound presentation.</p>
        </div>
        <div className="ptdt-toolbar">
          <button type="button" className="ptdt-action-btn" onClick={() => void loadData()} disabled={loading}><RefreshCw size={14} /> Refresh</button>
          <button type="button" className="btn-brand" onClick={() => setShowForm(value => !value)} style={{ minHeight: 38, fontSize: 12 }}><Plus size={14} /> {showForm ? 'Cancel' : 'Add Caller ID'}</button>
        </div>
      </div>

      {error && <div className="glass" style={{ color: 'var(--danger)', marginBottom: 14, padding: 14, borderColor: 'rgba(239,68,68,.28)' }}>{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="glass" style={{ padding: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 18 }}>
          <input className="ptdt-input" value={form.displayNumber} onChange={e => setForm({ ...form, displayNumber: e.target.value })} placeholder="E.164 number, e.g. +14155552671" required />
          <input className="ptdt-input" value={form.displayName || ''} onChange={e => setForm({ ...form, displayName: e.target.value })} placeholder="Display name / label" />
          <select className="ptdt-select" value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value as CallerIdPayload['scope'], userId: null, campaignId: null })}>
            <option value="all">Global</option><option value="campaign">Campaign</option><option value="user">User</option>
          </select>
          {form.scope === 'campaign' && <input className="ptdt-input" type="number" value={form.campaignId ?? ''} onChange={e => setForm({ ...form, campaignId: e.target.value ? Number(e.target.value) : null })} placeholder="Campaign ID" required />}
          {form.scope === 'user' && <input className="ptdt-input" type="number" value={form.userId ?? ''} onChange={e => setForm({ ...form, userId: e.target.value ? Number(e.target.value) : null })} placeholder="User ID" required />}
          <input className="ptdt-input" value={form.provider || ''} onChange={e => setForm({ ...form, provider: e.target.value })} placeholder="Provider, e.g. generic/illyvoip/custom-sip" />
          <button type="submit" className="btn-brand" disabled={saving}>{saving ? 'Saving...' : 'Save Caller ID'}</button>
        </form>
      )}

      <div className="glass" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="ptdt-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead><tr style={{ background: 'var(--bg-glass)' }}>{['Number', 'Label', 'Scope', 'Provider', 'Active', 'Verified', 'Actions'].map(h => <th key={h} style={{ padding: '13px 16px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} style={{ padding: 30, color: 'var(--text-3)' }}>Loading caller IDs...</td></tr> : numbers.length === 0 ? <tr><td colSpan={7} style={{ padding: 30, color: 'var(--text-3)' }}>No caller IDs configured yet.</td></tr> : numbers.map(record => (
                <tr className="table-row" key={record.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="mono" style={{ padding: '13px 16px', fontWeight: 900 }}>{record.displayNumber}</td>
                  <td style={{ padding: '13px 16px' }}>{record.displayName || '—'}</td>
                  <td style={{ padding: '13px 16px' }}><span className="ptdt-chip">{record.scope}</span></td>
                  <td style={{ padding: '13px 16px' }}>{record.provider || 'generic'}</td>
                  <td style={{ padding: '13px 16px' }}><button type="button" className={`ptdt-action-btn ${record.isActive ? 'active' : ''}`} onClick={() => void handleToggle(record)}>{record.isActive ? 'Active' : 'Inactive'}</button></td>
                  <td style={{ padding: '13px 16px' }}><span className={`badge ${record.isVerified ? 'badge-answered' : 'badge-pending'}`}>{record.isVerified ? 'Verified' : 'Pending'}</span></td>
                  <td style={{ padding: '13px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {!record.isVerified && <button className="ptdt-action-btn active" type="button" onClick={() => void handleVerify(record.id)}><ShieldCheck size={14} /> Verify</button>}
                    <button className="ptdt-action-btn danger" type="button" onClick={() => void handleDelete(record.id)}><Trash2 size={14} /> Delete</button>
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
