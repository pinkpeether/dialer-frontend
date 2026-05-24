import { useState } from 'react'
import { dialingModesAPI } from '../../api/dialingModes.api'

type Contact = {
  id: number
  name?: string | null
  phone: string
  company?: string | null
  email?: string | null
  notes?: string | null
}

type Props = {
  campaignId: number | string
}

export default function PreviewDialingPanel({ campaignId }: Props) {
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const next = async () => {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const data = await dialingModesAPI.getNextPreviewContact(campaignId)
      setContact(data?.contact || null)
      setMessage('Preview contact locked.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No preview contact available')
    } finally {
      setLoading(false)
    }
  }

  const release = async () => {
    if (!contact) return
    setLoading(true)
    setError('')
    try {
      await dialingModesAPI.releasePreviewContact(campaignId, contact.id)
      setContact(null)
      setMessage('Preview contact released.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to release preview contact')
    } finally {
      setLoading(false)
    }
  }

  const call = async () => {
    if (!contact) return
    setLoading(true)
    setError('')
    try {
      await dialingModesAPI.callPreviewContact(campaignId, contact.id)
      setMessage('Preview call initiated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start preview call')
    } finally {
      setLoading(false)
    }
  }

  const panelButton = {
    borderRadius: 'var(--radius-md)',
    padding: '9px 16px',
    fontSize: 12.5,
    fontWeight: 800,
  }

  return (
    <div className="glass lift" style={{ padding: 20, display: 'grid', gap: 14, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <div className="display" style={{ fontWeight: 900, fontSize: 16, color: 'var(--text)' }}>Preview Dialing</div>
          <div style={{ color: 'var(--text-3)', fontSize: 12.5, marginTop: 4 }}>
            Lock one contact, review details, then call or release.
          </div>
        </div>
        <button disabled={loading} className="btn-brand" style={panelButton} onClick={() => void next()}>
          {loading ? 'Loading...' : 'Get Next'}
        </button>
      </div>

      {error && <div style={{ color: 'var(--danger)', fontSize: 12.5, fontWeight: 800 }}>{error}</div>}
      {message && <div style={{ color: 'var(--green-2)', fontSize: 12.5, fontWeight: 800 }}>{message}</div>}

      {contact ? (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16, display: 'grid', gap: 8, background: 'var(--bg-glass)' }}>
          <div style={{ fontWeight: 900, fontSize: 18, color: 'var(--text)' }}>{contact.name || 'Unnamed Contact'}</div>
          <div className="mono" style={{ color: 'var(--pink)', fontWeight: 800 }}>{contact.phone}</div>
          {contact.company && <div style={{ color: 'var(--text-2)' }}>{contact.company}</div>}
          {contact.notes && <div style={{ color: 'var(--text-3)', fontSize: 13 }}>{contact.notes}</div>}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
            <button className="btn-brand" style={panelButton} disabled={loading} onClick={() => void call()}>Call</button>
            <button
              disabled={loading}
              onClick={() => void release()}
              style={{
                ...panelButton,
                background: 'var(--bg-glass)',
                border: '1px solid var(--border)',
                color: 'var(--text-3)',
              }}
            >
              Release
            </button>
          </div>
        </div>
      ) : (
        <div style={{ color: 'var(--text-3)', fontSize: 13 }}>No preview contact locked.</div>
      )}
    </div>
  )
}
