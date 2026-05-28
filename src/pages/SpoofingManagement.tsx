import { useEffect, useState } from 'react'
import { PhoneCall, Plus, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react'
import { spoofingApi } from '../api/spoofing.api'
import type { CallerIdPayload, CallerIdRecord } from '../api/spoofing.api'

const emptyForm: CallerIdPayload = {
  displayNumber: '',
  displayName: '',
  provider: 'generic',
  providerRef: '',
  scope: 'all',
  userId: null,
  campaignId: null,
}

const inputStyle: React.CSSProperties = {
  padding: '11px 13px',
  borderRadius: 14,
  border: '1px solid var(--border)',
  background: 'var(--bg-glass-hi)',
  color: 'var(--text)',
  outline: 'none',
}

export default function SpoofingManagement() {
  const [numbers, setNumbers] = useState<CallerIdRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CallerIdPayload>(emptyForm)
  const [error, setError] = useState('')

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      setNumbers(await spoofingApi.getAll())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load caller IDs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadData() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await spoofingApi.create(form)
      setForm(emptyForm)
      setShowForm(false)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create caller ID')
    } finally {
      setSaving(false)
    }
  }

  const handleVerify = async (id: number) => {
    setError('')
    try {
      await spoofingApi.verify(id)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify caller ID')
    }
  }

  const handleToggle = async (record: CallerIdRecord) => {
    setError('')
    try {
      await spoofingApi.update(record.id, { isActive: !record.isActive })
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update caller ID')
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this caller ID?')) return
    setError('')
    try {
      await spoofingApi.delete(id)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete caller ID')
    }
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 12 }}><PhoneCall size={12} /> Admin</div>
          <h1 className="display" style={{ fontSize: 38, fontWeight: 900, margin: 0 }}>Caller ID <span className="gradient-brand-text">Management</span></h1>
          <p style={{ color: 'var(--text-3)', maxWidth: 820, lineHeight: 1.6 }}>Manage approved outbound caller IDs for global, campaign, or user scope. Carrier/SIP-provider support is still required for actual outbound presentation.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => void loadData()} disabled={loading}><RefreshCw size={14} /> Refresh</button>
          <button type="button" className="btn-brand" onClick={() => setShowForm(value => !value)}><Plus size={14} /> {showForm ? 'Cancel' : 'Add Caller ID'}</button>
        </div>
      </div>

      {error && <div style={{ color: '#ef4444', marginBottom: 14 }}>{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="glass" style={{ padding: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 18 }}>
          <input style={inputStyle} value={form.displayNumber} onChange={e => setForm({ ...form, displayNumber: e.target.value })} placeholder="E.164 number, e.g. +14155552671" required />
          <input style={inputStyle} value={form.displayName || ''} onChange={e => setForm({ ...form, displayName: e.target.value })} placeholder="Display name / label" />
          <select style={inputStyle} value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value as CallerIdPayload['scope'], userId: null, campaignId: null })}>
            <option value="all">Global</option>
            <option value="campaign">Campaign</option>
            <option value="user">User</option>
          </select>
          {form.scope === 'campaign' && <input style={inputStyle} type="number" value={form.campaignId ?? ''} onChange={e => setForm({ ...form, campaignId: e.target.value ? Number(e.target.value) : null })} placeholder="Campaign ID" required />}
          {form.scope === 'user' && <input style={inputStyle} type="number" value={form.userId ?? ''} onChange={e => setForm({ ...form, userId: e.target.value ? Number(e.target.value) : null })} placeholder="User ID" required />}
          <input style={inputStyle} value={form.provider || ''} onChange={e => setForm({ ...form, provider: e.target.value })} placeholder="Provider, e.g. generic/twilio/custom-sip" />
          <button type="submit" className="btn-brand" disabled={saving}>{saving ? 'Saving...' : 'Save Caller ID'}</button>
        </form>
      )}

      <div className="glass" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: 'var(--bg-glass)' }}>{['Number', 'Label', 'Scope', 'Provider', 'Active', 'Verified', 'Actions'].map(h => <th key={h} style={{ padding: '13px 16px', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--text-3)' }}>{h}</th>)}</tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} style={{ padding: 26, color: 'var(--text-3)' }}>Loading caller IDs...</td></tr> : numbers.length === 0 ? <tr><td colSpan={7} style={{ padding: 26, color: 'var(--text-3)' }}>No caller IDs configured yet.</td></tr> : numbers.map(record => (
                <tr key={record.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="mono" style={{ padding: '13px 16px', fontWeight: 900 }}>{record.displayNumber}</td>
                  <td style={{ padding: '13px 16px' }}>{record.displayName || '—'}</td>
                  <td style={{ padding: '13px 16px' }}>{record.scope}</td>
                  <td style={{ padding: '13px 16px' }}>{record.provider || 'generic'}</td>
                  <td style={{ padding: '13px 16px' }}><button type="button" onClick={() => void handleToggle(record)}>{record.isActive ? 'Active' : 'Inactive'}</button></td>
                  <td style={{ padding: '13px 16px', color: record.isVerified ? 'var(--green-2)' : '#f0b90b', fontWeight: 900 }}>{record.isVerified ? 'Verified' : 'Pending'}</td>
                  <td style={{ padding: '13px 16px', display: 'flex', gap: 8 }}>
                    {!record.isVerified && <button type="button" onClick={() => void handleVerify(record.id)}><ShieldCheck size={14} /> Verify</button>}
                    <button type="button" onClick={() => void handleDelete(record.id)}><Trash2 size={14} /> Delete</button>
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