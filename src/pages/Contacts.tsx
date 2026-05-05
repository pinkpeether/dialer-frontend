import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookUser, Upload, Search, Trash2 } from 'lucide-react'
import { useContacts }  from '../hooks/useContacts'
import StatsCard        from '../components/StatsCard'
import { campaignsAPI } from '../api/campaigns.api'

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  PENDING:   { color: 'var(--warning)',    bg: 'var(--warning-bg)' },
  CALLING:   { color: 'var(--accent)',     bg: 'var(--accent-bg)'  },
  ANSWERED:  { color: 'var(--success)',    bg: 'var(--success-bg)' },
  DONE:      { color: 'var(--success)',    bg: 'var(--success-bg)' },
  NO_ANSWER: { color: 'var(--warning)',    bg: 'var(--warning-bg)' },
  BUSY:      { color: 'var(--danger)',     bg: 'var(--danger-bg)'  },
  DNC:       { color: 'var(--text-muted)', bg: 'var(--bg-hover)'   },
}

const filterStyle: React.CSSProperties = {
  padding: '9px 14px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-input)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  fontSize: 13, outline: 'none',
  backdropFilter: 'blur(8px)',
}

export default function Contacts() {
  const [search,    setSearch]    = useState('')
  const [campId,    setCampId]    = useState<number | undefined>()
  const [status,    setStatus]    = useState<string | undefined>()
  const [campaigns, setCampaigns] = useState<Record<string,unknown>[]>([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { contacts, stats, loading, pagination, uploadCSV, deleteContact } =
    useContacts({
      campaignId: campId,
      status:     status || undefined,
      search:     search || undefined,
      limit:      50,
    })

  useEffect(() => {
    campaignsAPI.getAll().then(d => setCampaigns(d.campaigns || []))
  }, [])

  const handleCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !campId) { alert('Select a campaign first'); return }
    setUploading(true)
    try {
      const result = await uploadCSV(campId, file)
      alert(`✓ Imported: ${result.imported} | Duplicates: ${result.duplicates} | DNC: ${result.dncSkipped}`)
    } catch { alert('Upload failed') }
    finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1600, margin: '0 auto' }}>

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 28, gap: 16, flexWrap: 'wrap',
      }}>
        <div>
          <h1 className="display" style={{
            fontSize: 28, fontWeight: 700, color: 'var(--text-primary)',
            letterSpacing: '-0.02em', marginBottom: 4,
          }}>
            Contact <span className="gradient-brand-text">Management</span>
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
            {pagination
              ? `${(pagination as Record<string,number>).total} total contacts`
              : 'Manage your dialing contacts'}
          </p>
        </div>
        <div>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} style={{ display: 'none' }}/>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--success-bg)',
              border: '1px solid var(--success)',
              borderRadius: 'var(--radius-lg)',
              padding: '11px 22px',
              cursor: 'pointer', color: 'var(--success)',
              fontWeight: 700, fontSize: 13.5,
              boxShadow: '0 0 20px var(--success-glow)',
            }}
          >
            <Upload size={15}/> {uploading ? 'Uploading…' : 'Upload CSV'}
          </motion.button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 14, marginBottom: 28,
        }}>
          {[
            { label: 'Total',     value: Number((stats as Record<string,unknown>).total),     color: 'var(--accent)',  bg: 'var(--accent-bg)'  },
            { label: 'Pending',   value: Number((stats as Record<string,unknown>).pending),   color: 'var(--warning)', bg: 'var(--warning-bg)' },
            { label: 'Answered',  value: Number((stats as Record<string,unknown>).answered),  color: 'var(--success)', bg: 'var(--success-bg)' },
            { label: 'No Answer', value: Number((stats as Record<string,unknown>).noAnswer),  color: 'var(--danger)',  bg: 'var(--danger-bg)'  },
            { label: 'Answer %',  value: `${(stats as Record<string,unknown>).answerRate}%`,  color: 'var(--pink)',    bg: 'var(--pink-bg)'    },
          ].map((s, i) => (
            <StatsCard key={i} index={i} label={s.label} value={s.value}
              icon={<BookUser size={16}/>} color={s.color} bg={s.bg}/>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'center',
        marginBottom: 16, flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} color="var(--text-muted)" style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          }}/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            style={{ ...filterStyle, paddingLeft: 34, width: 220 }}/>
        </div>
        <select value={campId ?? ''}
          onChange={e => setCampId(e.target.value ? Number(e.target.value) : undefined)}
          style={filterStyle}>
          <option value="">All Campaigns</option>
          {campaigns.map(c => (
            <option key={c.id as number} value={c.id as number}>{c.name as string}</option>
          ))}
        </select>
        <select value={status ?? ''} onChange={e => setStatus(e.target.value || undefined)}
          style={filterStyle}>
          <option value="">All Status</option>
          {['PENDING','CALLING','ANSWERED','NO_ANSWER','BUSY','DONE','DNC'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="glass" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-glass)' }}>
                {['#', 'Name', 'Phone', 'Campaign', 'Status', 'Action'].map(h => (
                  <th key={h} style={{
                    padding: '13px 16px', textAlign: 'left',
                    fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: 1,
                    borderBottom: '1px solid var(--border)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  Loading contacts…
                </td></tr>
              ) : contacts.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  No contacts found
                </td></tr>
              ) : contacts.map((c, i) => {
                const sc = STATUS_COLORS[c.status as string] || STATUS_COLORS.PENDING
                return (
                  <motion.tr
                    key={c.id as number}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.015 }}
                    className="table-row"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td className="mono" style={{
                      padding: '14px 16px', fontSize: 12, color: 'var(--text-muted)',
                    }}>
                      {String(i+1).padStart(2,'0')}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'var(--grad-brand)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700, color: '#fff',
                          boxShadow: '0 0 12px var(--accent-glow)',
                        }}>
                          {(c.name as string)?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {c.name as string}
                        </span>
                      </div>
                    </td>
                    <td className="mono" style={{
                      padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)',
                    }}>
                      {c.phone as string}
                    </td>
                    <td className="mono" style={{
                      padding: '14px 16px', fontSize: 12, color: 'var(--text-muted)',
                    }}>
                      #{c.campaignId as number}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="badge" style={{
                        color: sc.color, background: sc.bg,
                        border: `1px solid ${sc.color}`,
                      }}>
                        {c.status as string}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={() => { if (confirm('Delete contact?')) deleteContact(c.id as number) }}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border-danger)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '6px 10px',
                          cursor: 'pointer', color: 'var(--danger)',
                          display: 'inline-flex', alignItems: 'center',
                        }}
                      >
                        <Trash2 size={13}/>
                      </button>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
