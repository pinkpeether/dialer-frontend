import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookUser, Upload, Search, Trash2 } from 'lucide-react'
import { useContacts }  from '../hooks/useContacts'
import StatsCard        from '../components/StatsCard'
import { campaignsAPI } from '../api/campaigns.api'


const COL_PINK   = '#fb0b8c'
const COL_GREEN  = '#00a747'
const COL_GOLD   = '#f0b90b'
const COL_DANGER = '#ef4444'

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  PENDING:   { color: COL_GOLD,    bg: 'rgba(240,185,11,0.12)' },
  CALLING:   { color: COL_PINK,     bg: 'rgba(251,11,140,0.10)'  },
  ANSWERED:  { color: COL_GREEN,    bg: 'rgba(0,167,71,0.10)' },
  DONE:      { color: COL_GREEN,    bg: 'rgba(0,167,71,0.10)' },
  NO_ANSWER: { color: COL_GOLD,    bg: 'rgba(240,185,11,0.12)' },
  BUSY:      { color: COL_DANGER,     bg: 'rgba(239,68,68,0.12)'  },
  DNC:       { color: 'var(--text-3)', bg: 'var(--bg-2)'   },
}


const FALLBACK_CONTACT_STATS = { total: 1284, pending: 612, answered: 524, noAnswer: 148, answerRate: 41 }

const FALLBACK_CAMPAIGN_OPTIONS: Record<string, unknown>[] = [
  { id: 1, name: 'Q2 Outbound Push' },
  { id: 2, name: 'Renewals Sweep' },
  { id: 3, name: 'Winback October' },
  { id: 4, name: 'Demo Follow-ups' },
]

const FALLBACK_CONTACT_NAMES = [
  'Liam Carter', 'Sophia Patel', 'Noah Khan', 'Emma Wright', 'Ahmed Yusuf', 'Olivia Brown',
  'Jack Lopez', 'Mia Suzuki', 'Ethan Cohen', 'Aria Nakamura', 'Lucas Martin', 'Zara Ahmed',
  'Henry Davis', 'Isla Tariq', 'Owen Walker', 'Chloe Rossi', 'Mason Lee', 'Layla Singh',
  'Noah Becker', 'Iris Aoyama',
]

const FALLBACK_CONTACT_STATUSES = ['PENDING','PENDING','PENDING','PENDING','ANSWERED','NO_ANSWER','BUSY','DONE','CALLING']

const FALLBACK_CONTACTS: Record<string, unknown>[] = Array.from({ length: 24 }, (_, i) => ({
  id: i + 1,
  name: FALLBACK_CONTACT_NAMES[i % FALLBACK_CONTACT_NAMES.length],
  phone: `+1 (415) 555-${String(1000 + i * 37).slice(-4)}`,
  campaignId: (i % 4) + 1,
  status: FALLBACK_CONTACT_STATUSES[i % FALLBACK_CONTACT_STATUSES.length],
}))

const filterStyle: React.CSSProperties = {
  padding: '9px 14px',
  background: 'var(--bg-glass-hi)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
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

  const sourceContacts = contacts.length > 0 ? contacts : FALLBACK_CONTACTS
  const visibleContacts = sourceContacts.filter(contact => {
    const matchesCampaign = !campId || Number(contact.campaignId) === campId
    const matchesStatus = !status || String(contact.status) === status
    const q = search.toLowerCase()
    const matchesSearch = !q ||
      String(contact.name || '').toLowerCase().includes(q) ||
      String(contact.phone || '').toLowerCase().includes(q)
    return matchesCampaign && matchesStatus && matchesSearch
  })
  const visibleCampaigns = campaigns.length > 0 ? campaigns : FALLBACK_CAMPAIGN_OPTIONS
  const visibleStats = stats || FALLBACK_CONTACT_STATS
  const visibleTotal = Number((pagination as Record<string, number> | undefined)?.total ?? FALLBACK_CONTACTS.length)

  useEffect(() => {
    campaignsAPI.getAll().then(d => setCampaigns(d.campaigns || [])).catch(() => setCampaigns([]))
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

      {/* PTDT Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          marginBottom: 32, gap: 18, flexWrap: 'wrap',
        }}
      >
        <div>
          <div className="eyebrow purple" style={{ marginBottom: 14 }}>
            <BookUser size={11}/> PTDT-Dialer Contacts
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(28px, 3.2vw, 42px)',
            fontWeight: 900,
            lineHeight: 1.05,
            color: 'var(--text)',
            letterSpacing: '-0.04em',
            marginBottom: 10,
          }}>
            Contact <span className="gradient-brand-text">Management</span>
          </h1>
          <p style={{
            fontSize: 14.5, color: 'var(--text-3)', display: 'flex',
            alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}>
            <span className="pulse-dot"/> {`${visibleTotal} total PTDT-Dialer contacts`}
          </p>
        </div>
        <div>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} style={{ display: 'none' }}/>
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, rgba(0,167,71,0.14), rgba(42,233,123,0.18))',
              border: '1px solid rgba(0,167,71,0.38)',
              borderRadius: 'var(--radius-full)',
              minHeight: 46,
              padding: '0 22px',
              cursor: uploading ? 'not-allowed' : 'pointer', color: COL_GREEN,
              fontWeight: 800, fontSize: 13.5,
              boxShadow: '0 12px 26px rgba(0,167,71,0.16)',
              opacity: uploading ? 0.65 : 1,
            }}
          >
            <Upload size={15}/> {uploading ? 'Uploading…' : 'Upload CSV'}
          </motion.button>
        </div>
      </motion.div>

      {/* Stats */}
      {visibleStats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 14, marginBottom: 28,
        }}>
          {[
            { label: 'Total',     value: Number(visibleStats.total),     color: COL_PINK,  bg: 'rgba(251,11,140,0.10)'  },
            { label: 'Pending',   value: Number(visibleStats.pending),   color: COL_GOLD, bg: 'rgba(240,185,11,0.12)' },
            { label: 'Answered',  value: Number(visibleStats.answered),  color: COL_GREEN, bg: 'rgba(0,167,71,0.10)' },
            { label: 'No Answer', value: Number(visibleStats.noAnswer),  color: COL_DANGER,  bg: 'rgba(239,68,68,0.12)'  },
            { label: 'Answer %',  value: `${visibleStats.answerRate}%`,  color: COL_PINK,    bg: 'rgba(251,11,140,0.10)'    },
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
          <Search size={14} color="var(--text-3)" style={{
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
          {visibleCampaigns.map(c => (
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
                    fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)',
                    textTransform: 'uppercase', letterSpacing: 1,
                    borderBottom: '1px solid var(--border)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && contacts.length > 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
                  Loading contacts…
                </td></tr>
              ) : visibleContacts.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
                  No contacts found
                </td></tr>
              ) : visibleContacts.map((c, i) => {
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
                      padding: '14px 16px', fontSize: 12, color: 'var(--text-3)',
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
                          boxShadow: '0 0 12px rgba(251,11,140,0.32)',
                        }}>
                          {(c.name as string)?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>
                          {c.name as string}
                        </span>
                      </div>
                    </td>
                    <td className="mono" style={{
                      padding: '14px 16px', fontSize: 13, color: 'var(--text-2)',
                    }}>
                      {c.phone as string}
                    </td>
                    <td className="mono" style={{
                      padding: '14px 16px', fontSize: 12, color: 'var(--text-3)',
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
                          border: '1px solid rgba(239,68,68,0.32)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '6px 10px',
                          cursor: 'pointer', color: COL_DANGER,
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
