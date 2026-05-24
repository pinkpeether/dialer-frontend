type PreviewContact = {
  id: number | string
  name?: string
  phone?: string
  email?: string
  company?: string
  notes?: string
}

type Props = {
  contact: PreviewContact | null
  loading?: boolean
  onCall: () => void
  onSkip: () => void
  onDnc: () => void
}

export default function PreviewContactCard({ contact, loading, onCall, onSkip, onDnc }: Props) {
  if (loading) {
    return <div className="glass" style={{ padding: 18 }}>Loading next contact...</div>
  }

  if (!contact) {
    return <div className="glass" style={{ padding: 18, color: 'var(--text-3)' }}>No preview contact selected.</div>
  }

  return (
    <div className="glass" style={{ padding: 18, display: 'grid', gap: 12 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 900 }}>{contact.name || 'Unnamed Contact'}</div>
        <div className="mono" style={{ color: 'var(--text-3)' }}>{contact.phone}</div>
      </div>
      {contact.company && <div style={{ color: 'var(--text-2)' }}>{contact.company}</div>}
      {contact.notes && <div style={{ color: 'var(--text-3)', fontSize: 13 }}>{contact.notes}</div>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn-brand" onClick={onCall}>Call</button>
        <button onClick={onSkip}>Skip</button>
        <button onClick={onDnc} style={{ color: '#ef4444' }}>DNC</button>
      </div>
    </div>
  )
}
