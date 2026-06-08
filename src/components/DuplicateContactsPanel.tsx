import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw, Users } from 'lucide-react'
import { contactManagementProAPI } from '../api/contactManagementPro.api'

type DuplicateContact = {
  id: number
  name?: string | null
  phone: string
  email?: string | null
  company?: string | null
  status: string
  campaignId?: number | null
}

type DuplicateGroup = {
  normalizedPhone: string
  count: number
  suggestedPrimaryId: number | null
  contacts: DuplicateContact[]
}

export default function DuplicateContactsPanel() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadDuplicates = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await contactManagementProAPI.getDuplicates()
      setGroups((data.duplicateGroups || []) as DuplicateGroup[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load duplicate contacts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDuplicates()
  }, [])

  return (
    <section className="ptdt-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 10 }}>
            <Users size={12} /> Duplicate Detection
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 24 }}>Duplicate Contacts</h2>
          <p style={{ color: 'var(--text-3)', marginTop: 8 }}>
            Find contacts sharing the same normalized phone number before they hit live campaigns.
          </p>
        </div>
        <button type="button" className="ptdt-action-btn" onClick={() => void loadDuplicates()} disabled={loading}>
          <RefreshCw size={14} /> {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="ptdt-card" style={{ padding: 12, marginBottom: 14, color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.28)' }}>
          {error}
        </div>
      )}

      {groups.length === 0 && !loading ? (
        <div className="glass" style={{ padding: 18, borderRadius: 18, color: 'var(--text-3)' }}>
          No duplicate phone groups found.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {groups.map(group => (
            <div key={group.normalizedPhone} className="glass" style={{ padding: 16, borderRadius: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: 'var(--warning)' }}>
                  <AlertTriangle size={16} />
                  {group.count} contacts share {group.normalizedPhone}
                </div>
                <span className="ptdt-chip">Primary #{group.suggestedPrimaryId ?? '-'}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                {group.contacts.map(contact => (
                  <div key={contact.id} className="ptdt-card" style={{ padding: 12 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text)' }}>#{contact.id} {contact.name || 'Unnamed contact'}</div>
                    <div style={{ color: 'var(--text-3)', marginTop: 4, fontSize: 13 }}>{contact.phone}</div>
                    <div style={{ color: 'var(--text-3)', marginTop: 2, fontSize: 12.5 }}>{contact.email || 'No email'}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                      <span className="ptdt-chip">{contact.status}</span>
                      {contact.campaignId ? <span className="ptdt-chip">Campaign #{contact.campaignId}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
