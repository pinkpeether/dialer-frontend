import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Megaphone, Pause, Play, RefreshCw, Upload, Users } from 'lucide-react'
import { campaignsAPI } from '../api/campaigns.api'
import { contactsAPI } from '../api/contacts.api'
import CsvImportModal from '../components/CsvImportModal'
import CampaignRuntimeBanner from '../components/dialing/CampaignRuntimeBanner'
import PreviewDialingPanel from '../components/dialing/PreviewDialingPanel'
import PredictiveGuardrailPanel from '../components/dialing/PredictiveGuardrailPanel'

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
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const campaignId = Number(id)

  const detailQuery = useQuery({
    queryKey: ['campaign-detail', campaignId],
    queryFn: async () => {
      const campaignRes = await campaignsAPI.getById(campaignId)
      const contactsRes = await contactsAPI.getAll({ campaignId, limit: 100 }).catch(() => null)
      return {
        campaign: campaignRes as Campaign,
        contacts: extractList<Contact>(contactsRes, ['contacts', 'results']),
      }
    },
    enabled: Number.isFinite(campaignId),
    staleTime: 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: previousData => previousData,
  })

  const campaign = detailQuery.data?.campaign ?? null
  const contacts = useMemo(() => detailQuery.data?.contacts ?? [], [detailQuery.data?.contacts])
  const loading = detailQuery.isLoading

  const loadCampaign = async () => {
    setMessage('')
    await detailQuery.refetch()
  }

  const handleStatusChange = async (newStatus: CampaignStatus) => {
    if (!campaign) return
    setBusy(true)
    setMessage('')
    try {
      await campaignsAPI.updateStatus(campaign.id, newStatus)
      setMessage(`✓ Campaign status changed to ${newStatus}`)
      await queryClient.invalidateQueries({ queryKey: ['campaign-detail', campaign.id] })
      await queryClient.invalidateQueries({ queryKey: ['campaigns'] })
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
      await queryClient.invalidateQueries({ queryKey: ['campaign-detail', campaign.id] })
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
    <div className="ptdt-mobile-page ptdt-mobile-page-campaign-detail" style={{ padding: '32px 36px', maxWidth: 1600, margin: '0 auto' }}>
      <style>{PTDT_MOBILE_PAGE_CSS}</style>
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
