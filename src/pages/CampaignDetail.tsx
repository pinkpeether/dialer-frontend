import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Megaphone, Pause, Play, RefreshCw, Upload, Users } from 'lucide-react'
import { campaignsAPI } from '../api/campaigns.api'
import { contactsAPI } from '../api/contacts.api'
import CsvImportModal from '../components/CsvImportModal'
import CampaignRuntimeBanner from '../components/dialing/CampaignRuntimeBanner'
import PreviewDialingPanel from '../components/dialing/PreviewDialingPanel'
import PredictiveGuardrailPanel from '../components/dialing/PredictiveGuardrailPanel'

type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED'

type Campaign = {
  id: number
  name: string
  description?: string | null
  status: CampaignStatus | string
  mode?: string | null
  waitingReason?: string | null
  dialingRatio?: number
  maxRetries?: number
  timezone?: string
  stats?: Record<string, unknown>
}

type Contact = {
  id: number
  name?: string | null
  phone: string
  status: string
  createdAt: string
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const extractList = <T,>(payload: unknown, keys: string[]): T[] => {
  if (Array.isArray(payload)) return payload as T[]
  if (!isRecord(payload)) return []
  for (const key of keys) {
    const value = payload[key]
    if (Array.isArray(value)) return value as T[]
  }
  return []
}

const getNumber = (value: unknown, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

const formatDate = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

const statusColor = (status: string) => {
  if (status === 'ACTIVE') return '#00a747'
  if (status === 'PAUSED') return '#f0b90b'
  if (status === 'COMPLETED') return '#8057d7'
  return 'var(--text-3)'
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const campaignId = Number(id)

  const loadCampaign = useCallback(async () => {
    if (!Number.isFinite(campaignId)) return
    setLoading(true)
    setMessage('')

    try {
      const campaignRes = await campaignsAPI.getById(campaignId)
      setCampaign(campaignRes as Campaign)

      try {
        const contactsRes = await contactsAPI.getAll({ campaignId, limit: 100 })
        setContacts(extractList<Contact>(contactsRes, ['contacts', 'results']))
      } catch {
        setContacts([])
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load campaign detail.')
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => { void loadCampaign() }, [loadCampaign])

  const handleStatusChange = async (newStatus: CampaignStatus) => {
    if (!campaign) return
    setBusy(true)
    setMessage('')
    try {
      const updated = await campaignsAPI.updateStatus(campaign.id, newStatus)
      setCampaign({ ...campaign, ...(updated || {}), status: newStatus })
      setMessage(`✓ Campaign status changed to ${newStatus}`)
      void loadCampaign()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to update campaign status.')
    } finally {
      setBusy(false)
    }
  }

  const handleImport = async (file: File) => {
    if (!campaign) return
    setBusy(true)
    setMessage('')
    try {
      await contactsAPI.uploadCSV(campaign.id, file)
      setImportOpen(false)
      await loadCampaign()
      setMessage('✓ Contacts imported')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to import contacts.')
    } finally {
      setBusy(false)
    }
  }

  const stats = useMemo(() => {
    const backendStats = campaign?.stats || {}
    const total = getNumber(backendStats.total, contacts.length)
    const pending = getNumber(backendStats.pending, contacts.filter(c => c.status === 'PENDING').length)
    const answered = getNumber(backendStats.answered, contacts.filter(c => ['ANSWERED', 'CONTACTED', 'DONE'].includes(c.status)).length)
    const missed = getNumber(backendStats.missed, contacts.filter(c => ['NO_ANSWER', 'BUSY', 'VOICEMAIL'].includes(c.status)).length)
    const active = getNumber(backendStats.active, contacts.filter(c => ['CALLING', 'IN_QUEUE'].includes(c.status)).length)
    const dialed = Math.max(0, total - pending)
    const answerRate = getNumber(backendStats.answerRate, dialed > 0 ? Math.round((answered / dialed) * 100) : 0)
    return { total, pending, answered, missed, active, answerRate }
  }, [campaign, contacts])

  const progress = stats.total > 0 ? Math.min(100, Math.round((stats.answered / stats.total) * 100)) : 0

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1600, margin: '0 auto' }}>
      <button
        type="button"
        onClick={() => navigate('/campaigns')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 18, padding: '9px 14px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)', background: 'var(--bg-glass)', color: 'var(--text-3)', fontWeight: 800, cursor: 'pointer' }}
      >
        <ArrowLeft size={14} /> Back to Campaigns
      </button>

      {message && (
        <div style={{ marginBottom: 18, padding: '12px 16px', borderRadius: 'var(--radius-md)', border: message.startsWith('✓') ? '1px solid rgba(0,167,71,0.28)' : '1px solid rgba(239,68,68,0.28)', background: message.startsWith('✓') ? 'rgba(0,167,71,0.10)' : 'rgba(239,68,68,0.10)', color: message.startsWith('✓') ? 'var(--green-2)' : 'var(--danger)', fontWeight: 700 }}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="glass" style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>Loading campaign…</div>
      ) : !campaign ? (
        <div className="glass" style={{ padding: 40, color: 'var(--text-3)', textAlign: 'center' }}>Campaign not found.</div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap', marginBottom: 20 }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 3.2vw, 42px)', fontWeight: 900, lineHeight: 1.05, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: 10 }}>
                {campaign.name || 'Campaign'} <span className="gradient-brand-text">Overview</span>
              </h1>
              <p style={{ fontSize: 14.5, color: 'var(--text-3)' }}>{campaign.description || 'Inspect contacts, call logs, progress, and campaign controls.'}</p>
            </div>
            <span className="badge" style={{ color: statusColor(String(campaign.status)), border: `1px solid ${statusColor(String(campaign.status))}` }}>{campaign.status}</span>
          </div>

          <div style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
            <CampaignRuntimeBanner mode={campaign.mode} waitingReason={campaign.waitingReason} timezone={campaign.timezone} />

            {String(campaign.mode || '').toUpperCase() === 'PREVIEW' && <PreviewDialingPanel campaignId={campaign.id} />}

            {String(campaign.mode || '').toUpperCase() === 'PREDICTIVE' && (
              <PredictiveGuardrailPanel dialingRatio={Number(campaign.dialingRatio ?? 1)} readyAgents={0} activeCalls={0} />
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 24 }}>
            <MetricCard label="Contacts" value={stats.total} icon={<Users size={16} />} color="var(--pink)" />
            <MetricCard label="Pending" value={stats.pending} icon={<Megaphone size={16} />} color="var(--warning)" />
            <MetricCard label="Answered" value={stats.answered} icon={<CheckCircle2 size={16} />} color="var(--green-2)" />
            <MetricCard label="Answer Rate" value={`${stats.answerRate}%`} icon={<CheckCircle2 size={16} />} color="var(--purple)" />
          </div>

          <div className="glass" style={{ padding: 22, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
              <div>
                <div className="display" style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>Campaign Controls</div>
                <div style={{ color: 'var(--text-3)', fontSize: 12.5, marginTop: 4 }}>
                  Mode {campaign.mode || 'PROGRESSIVE'} · Ratio {campaign.dialingRatio ?? 1}x · Retries {campaign.maxRetries ?? 3} · {campaign.timezone || 'UTC'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {(campaign.status === 'DRAFT' || campaign.status === 'PAUSED') && <button disabled={busy} className="btn-brand" onClick={() => void handleStatusChange('ACTIVE')}><Play size={14} /> Start</button>}
                {campaign.status === 'ACTIVE' && <button disabled={busy} onClick={() => void handleStatusChange('PAUSED')}><Pause size={14} /> Pause</button>}
                {campaign.status !== 'COMPLETED' && <button disabled={busy} onClick={() => void handleStatusChange('COMPLETED')}><CheckCircle2 size={14} /> Complete</button>}
                <button disabled={busy} onClick={() => setImportOpen(true)}><Upload size={14} /> Import CSV</button>
                <button disabled={busy} onClick={() => void loadCampaign()}><RefreshCw size={14} /> Refresh</button>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--text-3)', marginBottom: 8 }}>
                <span>Answered progress</span>
                <span className="mono">{progress}%</span>
              </div>
              <div style={{ height: 11, background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: 'var(--grad-brand)', transition: 'width 0.25s ease' }} />
              </div>
            </div>
          </div>

          <section className="glass" style={{ padding: 22 }}>
            <div style={{ marginBottom: 16 }}>
              <h2 className="display" style={{ fontSize: 20, marginBottom: 4 }}>Contacts</h2>
              <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Campaign contact queue and latest imported leads.</p>
            </div>

            {contacts.length === 0 ? (
              <div style={{ padding: 32, color: 'var(--text-3)', textAlign: 'center' }}>No contacts yet. Import a CSV to populate this campaign.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Name', 'Phone', 'Status', 'Added'].map(h => <th key={h} className="mono" style={{ padding: '12px 10px', fontSize: 10.5, color: 'var(--text-3)', letterSpacing: 1.1, textTransform: 'uppercase', textAlign: 'left', fontWeight: 700 }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map(contact => (
                      <tr key={contact.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '13px 10px', color: 'var(--text)', fontWeight: 700 }}>{contact.name || 'Unknown'}</td>
                        <td className="mono" style={{ padding: '13px 10px', color: 'var(--text-3)', fontSize: 12.5 }}>{contact.phone}</td>
                        <td style={{ padding: '13px 10px' }}>{contact.status}</td>
                        <td style={{ padding: '13px 10px', color: 'var(--text-3)', fontSize: 12.5 }}>{formatDate(contact.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <CsvImportModal open={importOpen} onClose={() => setImportOpen(false)} onSubmit={handleImport} />
        </>
      )}
    </div>
  )
}

function MetricCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="glass" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          <div style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)' }}>{value}</div>
        </div>
        <div style={{ color }}>{icon}</div>
      </div>
    </div>
  )
}
