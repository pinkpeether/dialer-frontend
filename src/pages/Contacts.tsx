import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookUser, Upload, Search, Trash2, Plus, X } from 'lucide-react'
import { useContacts }  from '../hooks/useContacts'
import StatsCard        from '../components/StatsCard'
import { campaignsAPI } from '../api/campaigns.api'

const PTDT_MOBILE_PAGE_CSS = `
@media (max-width: 900px) {
  .ptdt-mobile-page {
    width: 100% !important;
    max-width: 100vw !important;
    margin: 0 !important;
    padding: 72px 12px 28px !important;
    overflow-x: hidden !important;
    box-sizing: border-box !important;
  }

  .ptdt-mobile-page *,
  .ptdt-mobile-page *::before,
  .ptdt-mobile-page *::after {
    box-sizing: border-box;
    min-width: 0;
  }

  .ptdt-mobile-page .eyebrow {
    max-width: 100% !important;
    white-space: normal !important;
    line-height: 1.35 !important;
  }

  .ptdt-mobile-page h1 {
    font-size: clamp(1.8rem, 8vw, 2.4rem) !important;
    line-height: 1.04 !important;
    overflow-wrap: anywhere !important;
  }

  .ptdt-mobile-page h2,
  .ptdt-mobile-page h3 {
    overflow-wrap: anywhere !important;
  }

  .ptdt-mobile-page p,
  .ptdt-mobile-page span,
  .ptdt-mobile-page div {
    max-width: 100%;
  }

  .ptdt-mobile-page .mono {
    overflow-wrap: anywhere !important;
    word-break: normal !important;
  }

  .ptdt-mobile-page [style*="display: grid"],
  .ptdt-mobile-page [style*="display:grid"] {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  .ptdt-mobile-page [style*="grid-template-columns"],
  .ptdt-mobile-page [style*="gridTemplateColumns"] {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  .ptdt-mobile-page [style*="grid-column"],
  .ptdt-mobile-page [style*="gridColumn"] {
    grid-column: auto !important;
  }

  .ptdt-mobile-page [style*="display: flex"],
  .ptdt-mobile-page [style*="display:flex"] {
    flex-wrap: wrap !important;
    min-width: 0 !important;
  }

  .ptdt-mobile-page [style*="justify-content: space-between"],
  .ptdt-mobile-page [style*="justifyContent: space-between"] {
    justify-content: flex-start !important;
  }

  .ptdt-mobile-page .glass,
  .ptdt-mobile-page .glass-hi,
  .ptdt-mobile-page .ptdt-card,
  .ptdt-mobile-page .lift {
    width: 100% !important;
    max-width: 100% !important;
    border-radius: 18px !important;
  }

  .ptdt-mobile-page .glass,
  .ptdt-mobile-page .glass-hi {
    padding: 14px !important;
  }

  .ptdt-mobile-page .glass:has(table),
  .ptdt-mobile-page .glass-hi:has(table),
  .ptdt-mobile-page .ptdt-card:has(table),
  .ptdt-mobile-page [style*="overflow-x"],
  .ptdt-mobile-page [style*="overflowX"] {
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
  }

  .ptdt-mobile-page table {
    min-width: 640px !important;
    width: max-content !important;
    table-layout: auto !important;
    border-collapse: collapse !important;
  }

  .ptdt-mobile-page th,
  .ptdt-mobile-page td {
    white-space: nowrap !important;
    word-break: normal !important;
    overflow-wrap: normal !important;
    padding: 10px 12px !important;
    vertical-align: middle !important;
  }

  .ptdt-mobile-page input,
  .ptdt-mobile-page textarea,
  .ptdt-mobile-page select,
  .ptdt-mobile-page .ptdt-input,
  .ptdt-mobile-page .ptdt-select,
  .ptdt-mobile-page .ptdt-textarea {
    width: 100% !important;
    max-width: 100% !important;
  }

  .ptdt-mobile-page input[type="number"] {
    min-width: 82px !important;
    width: 100% !important;
  }

  .ptdt-mobile-page button,
  .ptdt-mobile-page .btn-brand,
  .ptdt-mobile-page .ptdt-action-btn,
  .ptdt-mobile-page .ptdt-action-icon-btn {
    max-width: 100% !important;
    white-space: normal !important;
  }

  .ptdt-mobile-page .btn-brand {
    min-height: 42px !important;
  }

  .ptdt-mobile-page .ptdt-action-icon-btn {
    width: 40px !important;
    min-width: 40px !important;
    flex: 0 0 auto !important;
  }

  .ptdt-mobile-page .ptdt-toolbar {
    width: 100% !important;
    justify-content: flex-start !important;
    overflow-x: auto !important;
    flex-wrap: nowrap !important;
    padding-bottom: 6px !important;
  }

  .ptdt-mobile-page .ptdt-toolbar > * {
    flex: 0 0 auto !important;
  }

  .ptdt-mobile-page svg,
  .ptdt-mobile-page canvas {
    max-width: 100% !important;
  }

  .ptdt-mobile-page .recharts-wrapper,
  .ptdt-mobile-page .recharts-surface,
  .ptdt-mobile-page .recharts-responsive-container {
    max-width: 100% !important;
  }

  .ptdt-mobile-page .recharts-legend-wrapper {
    max-width: 100% !important;
  }

  .ptdt-mobile-page audio,
  .ptdt-mobile-page video {
    max-width: 100% !important;
  }
}

@media (max-width: 560px) {
  .ptdt-mobile-page {
    padding: 66px 10px 24px !important;
  }

  .ptdt-mobile-page .glass,
  .ptdt-mobile-page .glass-hi {
    padding: 12px !important;
    border-radius: 16px !important;
  }

  .ptdt-mobile-page h1 {
    font-size: clamp(1.65rem, 9vw, 2.1rem) !important;
  }

  .ptdt-mobile-page table {
    min-width: 600px !important;
  }

  .ptdt-mobile-page th,
  .ptdt-mobile-page td {
    padding: 9px 10px !important;
    font-size: 12px !important;
  }
}
`



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
  const [addOpen, setAddOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '', notes: '' })
  const [contactCampaignId, setContactCampaignId] = useState<number | ''>('')
  const fileRef = useRef<HTMLInputElement>(null)

  const { contacts, stats, loading, error, pagination, uploadCSV, createContact, deleteContact } =
    useContacts({
      campaignId: campId,
      status:     status || undefined,
      search:     search || undefined,
      limit:      50,
    })

  const visibleContacts = contacts.filter(contact => {
    const matchesCampaign = !campId || Number(contact.campaignId) === campId
    const matchesStatus = !status || String(contact.status) === status
    const q = search.toLowerCase()
    const matchesSearch = !q ||
      String(contact.name || '').toLowerCase().includes(q) ||
      String(contact.phone || '').toLowerCase().includes(q)
    return matchesCampaign && matchesStatus && matchesSearch
  })
  const visibleCampaigns = campaigns
  const visibleStats = stats
  const visibleTotal = Number((pagination as Record<string, number> | undefined)?.total ?? contacts.length)

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
    } catch (err) { alert(err instanceof Error ? err.message : 'Upload failed') }
    finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }


  const handleCreateContact = async () => {
    if (!newContact.phone.trim()) { alert('Phone number is required'); return }
    if (!contactCampaignId) { alert('Select a campaign before adding a contact'); return }
    setCreating(true)
    try {
      await createContact({
        name: newContact.name.trim() || newContact.phone.trim(),
        phone: newContact.phone.trim(),
        email: newContact.email.trim() || undefined,
        notes: newContact.notes.trim() || undefined,
        campaignId: contactCampaignId,
      })
      setNewContact({ name: '', phone: '', email: '', notes: '' })
      setAddOpen(false)
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed to add contact') }
    finally { setCreating(false) }
  }

  return (
    <div className="ptdt-page ptdt-mobile-page ptdt-mobile-page-contacts">
      <style>{PTDT_MOBILE_PAGE_CSS}</style>

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
          {error && (
            <p style={{
              marginTop: 8,
              fontSize: 12.5,
              color: 'var(--danger)',
              fontWeight: 700,
            }}>
              {error}
            </p>
          )}
        </div>
        <div className="ptdt-toolbar">
          <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} style={{ display: 'none' }}/>
          <button
            type="button"
            className="ptdt-action-btn active"
            onClick={() => {
              setContactCampaignId(campId ?? '')
              setAddOpen(true)
            }}
          >
            <Plus size={14}/> Add Contact
          </button>
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="ptdt-action-btn active"
            style={{ color: COL_GREEN }}
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
          <table className="ptdt-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
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


      {addOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10050, background: 'rgba(3,2,8,0.58)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }} onMouseDown={e => { if (e.target === e.currentTarget) setAddOpen(false) }}>
          <div className="glass-hi" style={{ width: 'min(520px, 96vw)', padding: 24, borderRadius: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <div className="eyebrow purple" style={{ marginBottom: 10 }}><BookUser size={12}/> Individual Contact</div>
                <h2 className="display" style={{ fontSize: 22 }}>Add Contact</h2>
              </div>
              <button type="button" className="ptdt-action-icon-btn" onClick={() => setAddOpen(false)}><X size={15}/></button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <select
                className="ptdt-input"
                value={contactCampaignId}
                onChange={e => setContactCampaignId(e.target.value ? Number(e.target.value) : '')}
                required
              >
                <option value="">Select campaign *</option>
                {visibleCampaigns.map(c => (
                  <option key={c.id as number} value={c.id as number}>{c.name as string}</option>
                ))}
              </select>
              <input className="ptdt-input" value={newContact.name} onChange={e => setNewContact({ ...newContact, name: e.target.value })} placeholder="Name / label" />
              <input className="ptdt-input mono" value={newContact.phone} onChange={e => setNewContact({ ...newContact, phone: e.target.value })} placeholder="Phone number *" />
              <input className="ptdt-input" value={newContact.email} onChange={e => setNewContact({ ...newContact, email: e.target.value })} placeholder="Email optional" />
              <textarea className="ptdt-textarea" value={newContact.notes} onChange={e => setNewContact({ ...newContact, notes: e.target.value })} placeholder="Notes optional" rows={3} />
              {!contactCampaignId && <div style={{ color: 'var(--warning)', fontSize: 12 }}>Campaign is required because contacts are stored inside a campaign.</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button className="ptdt-action-btn" type="button" onClick={() => setAddOpen(false)}>Cancel</button>
                <button className="btn-brand" type="button" disabled={creating || !newContact.phone.trim() || !contactCampaignId} onClick={() => void handleCreateContact()} style={{ minHeight: 38, fontSize: 12 }}>{creating ? 'Adding...' : 'Add Contact'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
