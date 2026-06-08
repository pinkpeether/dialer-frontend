import { useState, type CSSProperties } from 'react'
import { Clock3, Search } from 'lucide-react'
import { contactManagementProAPI } from '../api/contactManagementPro.api'

type TimelineEvent = {
  type: string
  occurredAt: string
  title: string
  description?: string
}

type TimelineResult = {
  contact?: { id: number; name?: string | null; phone: string; status: string; tags?: string[]; notes?: string | null }
  timeline?: TimelineEvent[]
}

const inputStyle: CSSProperties = {
  width: '100%',
  minHeight: 42,
  borderRadius: 14,
  border: '1px solid var(--border)',
  background: 'var(--bg-glass-hi)',
  color: 'var(--text)',
  padding: '0 12px',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}

export default function ContactTimelinePanel() {
  const [contactId, setContactId] = useState('')
  const [data, setData] = useState<TimelineResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadTimeline = async () => {
    const id = Number(contactId)
    if (!Number.isFinite(id) || id <= 0) {
      setError('Enter a valid contact ID')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await contactManagementProAPI.getTimeline(id)
      setData(result as TimelineResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timeline')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="ptdt-card" style={{ padding: 18 }}>
      <div style={{ marginBottom: 14 }}>
        <div className="eyebrow pink" style={{ marginBottom: 10 }}>
          <Clock3 size={12} /> Contact Timeline
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 24 }}>Timeline Explorer</h2>
        <p style={{ color: 'var(--text-3)', marginTop: 8 }}>
          Inspect calls, callbacks, notes, tags, and contact activity in one sequence.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <input
          value={contactId}
          onChange={event => setContactId(event.target.value)}
          placeholder="Contact ID"
          style={{ ...inputStyle, width: 220 }}
        />
        <button type="button" className="btn-brand" onClick={() => void loadTimeline()} disabled={loading}>
          <Search size={14} /> {loading ? 'Loading...' : 'Load'}
        </button>
      </div>

      {error && (
        <div className="ptdt-card" style={{ padding: 12, marginBottom: 14, color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.28)' }}>
          {error}
        </div>
      )}

      {data?.contact && (
        <div className="glass" style={{ padding: 14, borderRadius: 18, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, color: 'var(--text)' }}>
            #{data.contact.id} {data.contact.name || 'Unnamed'} - {data.contact.phone}
          </div>
          <div style={{ color: 'var(--text-3)', marginTop: 4, fontSize: 13 }}>Status: {data.contact.status}</div>
          {!!data.contact.tags?.length && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {data.contact.tags.map(tag => <span key={tag} className="ptdt-chip">{tag}</span>)}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {(data?.timeline || []).map((item, index) => (
          <div key={`${item.type}-${item.occurredAt}-${index}`} className="glass" style={{ padding: 14, borderRadius: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 700, color: 'var(--text)' }}>{item.title}</div>
              <div className="mono" style={{ color: 'var(--text-3)', fontSize: 11 }}>{new Date(item.occurredAt).toLocaleString()}</div>
            </div>
            <div style={{ marginTop: 8, color: 'var(--text-2)', fontSize: 13.5, lineHeight: 1.6 }}>
              {item.description || item.type}
            </div>
            <div className="mono" style={{ marginTop: 8, color: 'var(--text-3)', fontSize: 10.5, letterSpacing: 1.1, textTransform: 'uppercase' }}>
              {item.type}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
