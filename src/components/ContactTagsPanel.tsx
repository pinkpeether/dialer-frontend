import { useState, type CSSProperties } from 'react'
import { Save, Tags } from 'lucide-react'
import { contactManagementProAPI } from '../api/contactManagementPro.api'

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

export default function ContactTagsPanel() {
  const [contactId, setContactId] = useState('')
  const [tags, setTags] = useState('vip, interested')
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const saveTags = async () => {
    const id = Number(contactId)
    if (!Number.isFinite(id) || id <= 0) {
      setError('Enter a valid contact ID')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await contactManagementProAPI.updateTags(id, tags.split(',').map(tag => tag.trim()).filter(Boolean))
      if (notes.trim()) await contactManagementProAPI.updateNotes(id, notes.trim())
      setMessage('Contact tags and notes saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contact tags')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="ptdt-card" style={{ padding: 18 }}>
      <div style={{ marginBottom: 14 }}>
        <div className="eyebrow pink" style={{ marginBottom: 10 }}>
          <Tags size={12} /> Tags and Notes
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 24 }}>Metadata Controls</h2>
        <p style={{ color: 'var(--text-3)', marginTop: 8 }}>
          Save pilot-safe tags like VIP, Interested, Follow Up, or DNC Review directly on the contact.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <input
          value={contactId}
          onChange={event => setContactId(event.target.value)}
          placeholder="Contact ID"
          style={inputStyle}
        />
        <input
          value={tags}
          onChange={event => setTags(event.target.value)}
          placeholder="Tags comma separated"
          style={inputStyle}
        />
      </div>

      <textarea
        value={notes}
        onChange={event => setNotes(event.target.value)}
        placeholder="Optional notes update"
        rows={5}
        style={{ ...inputStyle, marginTop: 12, paddingTop: 12, paddingBottom: 12, minHeight: 120, resize: 'vertical' }}
      />

      {error && (
        <div className="ptdt-card" style={{ padding: 12, marginTop: 14, color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.28)' }}>
          {error}
        </div>
      )}
      {message && (
        <div className="ptdt-card" style={{ padding: 12, marginTop: 14, color: 'var(--green-2)', borderColor: 'rgba(34,197,94,0.24)' }}>
          {message}
        </div>
      )}

      <button type="button" className="btn-brand" onClick={() => void saveTags()} disabled={saving} style={{ marginTop: 14 }}>
        <Save size={14} /> {saving ? 'Saving...' : 'Save Contact Metadata'}
      </button>
    </section>
  )
}
