import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Eye, Megaphone, Pause, Play, Plus, Trash2, X } from 'lucide-react'
import { useCampaigns } from '../hooks/useCampaigns'
import StatsCard from '../components/StatsCard'
import DialingModeSelector from '../components/dialing/DialingModeSelector'
import DialingModeBadge from '../components/dialing/DialingModeBadge'
import PtdtDialog, { type PtdtDialogState } from '../components/PtdtDialog'

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


const COL_PINK = '#fb0b8c'
const COL_GREEN = '#00a747'
const COL_PURPLE = '#8057d7'
const COL_GOLD = '#f0b90b'

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  DRAFT:     { color: 'var(--text-3)', bg: 'var(--bg-2)' },
  ACTIVE:    { color: COL_GREEN,       bg: 'rgba(0,167,71,0.10)' },
  PAUSED:    { color: COL_GOLD,        bg: 'rgba(240,185,11,0.12)' },
  COMPLETED: { color: COL_PURPLE,      bg: 'rgba(128,87,215,0.12)' },
}

const inputStyle = {
  padding: '11px 14px',
  background: 'var(--bg-glass-hi)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  fontSize: 13,
  outline: 'none',
  width: '100%',
} as const

const campaignFieldLabelStyle = {
  color: 'var(--text-2)',
  fontSize: 12,
  fontWeight: 900,
} as const

const requiredStar = <span style={{ color: '#ef4444' }}> *</span>

const getNumber = (value: unknown, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

const getText = (value: unknown, fallback = '') => {
  return typeof value === 'string' ? value : fallback
}

export default function Campaigns() {
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [dialog, setDialog] = useState<PtdtDialogState | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    mode: 'PROGRESSIVE',
    dialingRatio: 1,
    script: '',
    timezone: 'Asia/Karachi',
  })

  const { campaigns, stats, loading, error, createCampaign, updateStatus, cloneCampaign, deleteCampaign, refetch } = useCampaigns()

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    setActionError('')

    try {
      const dialingRatio = Math.max(1, Math.min(10, Number(form.dialingRatio) || 1))
      await createCampaign({ ...form, dialingRatio, dialRatio: dialingRatio })
      setShowForm(false)
      setForm({ name: '', description: '', mode: 'PROGRESSIVE', dialingRatio: 1, script: '', timezone: 'Asia/Karachi' })
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; errors?: string[] } } })?.response?.data
      setActionError(data?.errors?.join('\\n') || data?.message || (err as Error).message || 'Failed to create campaign')
    }
  }

  const runAction = async (id: number, action: () => Promise<void>) => {
    setBusyId(id)
    setActionError('')
    try {
      await action()
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; errors?: string[] } } })?.response?.data
      setActionError(data?.errors?.join('\\n') || data?.message || (err as Error).message || 'Campaign action failed')
    } finally {
      setBusyId(null)
    }
  }

  const safeStats = stats || {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'ACTIVE').length,
    paused: campaigns.filter(c => c.status === 'PAUSED').length,
    draft: campaigns.filter(c => c.status === 'DRAFT').length,
    completed: campaigns.filter(c => c.status === 'COMPLETED').length,
  }

  const confirmDeleteCampaign = (campaignId: number, campaignName: string) => {
    setDialog({
      tone: 'confirm',
      title: 'Delete campaign?',
      message: `This will remove ${campaignName} and its related campaign contacts/calls from this workspace.`,
      confirmLabel: 'Delete Campaign',
      onConfirm: () => {
        setDialog(null)
        void runAction(campaignId, async () => {
          await deleteCampaign(campaignId)
          setDialog({ tone: 'success', title: 'Campaign deleted', message: 'The campaign has been deleted.' })
        })
      },
    })
  }

  return (
    <div className="ptdt-mobile-page ptdt-mobile-page-campaigns" style={{ padding: '32px 36px', maxWidth: 1600, margin: '0 auto' }}>
      <style>{PTDT_MOBILE_PAGE_CSS}</style>
      <PtdtDialog dialog={dialog} onClose={() => setDialog(null)} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, gap: 18, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 14 }}>
            <Megaphone size={11} /> PTDT-Dialer Campaigns
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 3.2vw, 42px)', fontWeight: 900, lineHeight: 1.05, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: 10 }}>
            Campaign <span className="gradient-brand-text">Management</span>
          </h1>
          <p style={{ fontSize: 14.5, color: 'var(--text-3)' }}>Create, inspect, and orchestrate PTDT-Dialer outbound campaigns.</p>
        </div>

        <button onClick={() => setShowForm(previous => !previous)} className="btn-brand" style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 'var(--radius-full)', padding: '0 22px', fontSize: 13.5, minHeight: 46 }}>
          {showForm ? <X size={15} /> : <Plus size={15} />} {showForm ? 'Cancel' : 'New Campaign'}
        </button>
      </div>

      {(error || actionError) && (
        <div style={{ whiteSpace: 'pre-wrap', marginBottom: 18, padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.28)', background: 'rgba(239,68,68,0.10)', color: 'var(--danger)', fontWeight: 700 }}>
          {actionError || error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Total',     value: getNumber(safeStats.total),     color: COL_PINK,   bg: 'rgba(251,11,140,0.10)' },
          { label: 'Active',    value: getNumber(safeStats.active),    color: COL_GREEN,  bg: 'rgba(0,167,71,0.10)' },
          { label: 'Paused',    value: getNumber(safeStats.paused),    color: COL_GOLD,   bg: 'rgba(240,185,11,0.12)' },
          { label: 'Draft',     value: getNumber(safeStats.draft),     color: COL_PURPLE, bg: 'rgba(128,87,215,0.12)' },
          { label: 'Completed', value: getNumber(safeStats.completed), color: COL_PURPLE, bg: 'rgba(128,87,215,0.12)' },
        ].map((item, index) => (
          <StatsCard key={item.label} index={index} label={item.label} value={item.value} icon={<Megaphone size={16} />} color={item.color} bg={item.bg} />
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="glass" style={{ padding: 24, marginBottom: 24 }}>
          <h3 className="display" style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 18 }}>New Campaign</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 14, marginBottom: 14, alignItems: 'start' }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={campaignFieldLabelStyle}>Campaign Name{requiredStar}</span>
              <input value={form.name} onChange={event => setForm(previous => ({ ...previous, name: event.target.value }))} required style={inputStyle} />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={campaignFieldLabelStyle}>Description</span>
              <input value={form.description} onChange={event => setForm(previous => ({ ...previous, description: event.target.value }))} style={inputStyle} />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={campaignFieldLabelStyle}>Dialing Ratio{requiredStar}</span>
              <input type="number" value={form.dialingRatio} onChange={event => setForm(previous => ({ ...previous, dialingRatio: Number(event.target.value) }))} required style={inputStyle} min={1} max={10} />
            </label>

            <DialingModeSelector value={form.mode} onChange={mode => setForm(previous => ({ ...previous, mode }))} />

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={campaignFieldLabelStyle}>Timezone{requiredStar}</span>
              <select required value={form.timezone} onChange={event => setForm(previous => ({ ...previous, timezone: event.target.value }))} style={inputStyle}>
                <option value="Asia/Karachi">Asia/Karachi</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
                <option value="America/Chicago">America/Chicago</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
                <option value="Europe/London">Europe/London</option>
              </select>
            </label>

            <label style={{ display: 'grid', gap: 6, gridColumn: 'span 3' }}>
              <span style={campaignFieldLabelStyle}>Call Script</span>
              <textarea value={form.script} onChange={event => setForm(previous => ({ ...previous, script: event.target.value }))} rows={3} style={{ ...inputStyle, minHeight: 88, resize: 'vertical' }} />
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn-brand" style={{ borderRadius: 'var(--radius-md)', padding: '10px 22px', fontSize: 13, color: '#fff' }}>Create Campaign</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 22px', color: 'var(--text-3)', fontSize: 13, fontWeight: 600 }}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="glass" style={{ textAlign: 'center', padding: 60, color: 'var(--text-3)' }}>Loading campaigns…</div>
      ) : campaigns.length === 0 ? (
        <div className="glass" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
          No campaigns found. Create a campaign to get started.
          <div style={{ marginTop: 16 }}><button onClick={() => void refetch()}>Refresh</button></div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {campaigns.map((campaign, index) => {
            const campaignId = getNumber(campaign.id)
            const campaignStatus = getText(campaign.status, 'DRAFT')
            const campaignMode = getText(campaign.mode, 'PROGRESSIVE')
            const style = STATUS_CONFIG[campaignStatus] || STATUS_CONFIG.DRAFT
            const dialingRatio = getNumber(campaign.dialingRatio ?? campaign.dialRatio, 1)
            const maxRetries = getNumber(campaign.maxRetries, 3)
            const timezone = getText(campaign.timezone, 'UTC')
            const statsData = campaign.stats as Record<string, unknown> | undefined
            const total = getNumber(campaign.totalContacts ?? statsData?.total, 0)
            const answered = getNumber(statsData?.answered, 0)
            const pending = getNumber(statsData?.pending, 0)
            const missed = getNumber(statsData?.missed, 0)

            return (
              <div key={campaignId || index} className="glass lift" style={{ padding: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 10 }}>
                  <div className="display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                    {getText(campaign.name, 'Untitled Campaign')}
                  </div>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <DialingModeBadge mode={campaignMode} />
                    <span className="badge" style={{ color: style.color, background: style.bg, border: `1px solid ${style.color}`, flexShrink: 0 }}>{campaignStatus}</span>
                  </div>
                </div>

                <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 14, lineHeight: 1.5, minHeight: 36 }}>
                  {getText(campaign.description, 'No description provided')}
                </p>

                {total > 0 && (
                  <div style={{ marginBottom: 14, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10.5, color: COL_GREEN, fontWeight: 700 }}>✓ {answered} answered</span>
                    <span style={{ fontSize: 10.5, color: COL_GOLD, fontWeight: 700 }}>◷ {pending} pending</span>
                    <span style={{ fontSize: 10.5, color: 'rgba(255,59,95,0.80)', fontWeight: 700 }}>✕ {missed} missed</span>
                    <span style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 700 }}>{total} total</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12, fontSize: 11.5, color: 'var(--text-3)', marginBottom: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <span>Ratio <b className="mono" style={{ color: 'var(--text)' }}>{dialingRatio}x</b></span>
                  <span>Retries <b className="mono" style={{ color: 'var(--text)' }}>{maxRetries}</b></span>
                  <span>TZ <b style={{ color: 'var(--text)' }}>{timezone.split('/')[1] || timezone}</b></span>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <ActionBtn onClick={() => navigate(`/campaigns/${campaignId}`)} icon={<Eye size={12} />} label="Details" color="var(--pink)" bg="rgba(251,11,140,0.10)" />
                  {campaignStatus === 'DRAFT' && <ActionBtn disabled={busyId === campaignId} onClick={() => runAction(campaignId, () => updateStatus(campaignId, 'ACTIVE'))} icon={<Play size={12} />} label="Activate" color="var(--green-2)" bg="rgba(0,167,71,0.10)" />}
                  {campaignStatus === 'ACTIVE' && <ActionBtn disabled={busyId === campaignId} onClick={() => runAction(campaignId, () => updateStatus(campaignId, 'PAUSED'))} icon={<Pause size={12} />} label="Pause" color="var(--warning)" bg="rgba(240,185,11,0.12)" />}
                  {campaignStatus === 'PAUSED' && <ActionBtn disabled={busyId === campaignId} onClick={() => runAction(campaignId, () => updateStatus(campaignId, 'ACTIVE'))} icon={<Play size={12} />} label="Resume" color="var(--green-2)" bg="rgba(0,167,71,0.10)" />}
                  <IconBtn disabled={busyId === campaignId} onClick={() => runAction(campaignId, () => cloneCampaign(campaignId))} icon={<Copy size={12} />} color="var(--text-3)" />
                  <IconBtn disabled={busyId === campaignId} onClick={() => confirmDeleteCampaign(campaignId, getText(campaign.name, 'this campaign'))} icon={<Trash2 size={12} />} color="var(--danger)" border="rgba(239,68,68,0.32)" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ActionBtn({ icon, label, onClick, color, bg, disabled }: { icon: React.ReactNode; label: string; onClick?: () => void; color: string; bg: string; disabled?: boolean }) {
  return (
    <button disabled={disabled} onClick={onClick} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: bg, border: `1px solid ${color}`, borderRadius: 'var(--radius-md)', padding: '9px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1, color, fontSize: 12, fontWeight: 600, minWidth: 94 }}>
      {icon} {label}
    </button>
  )
}

function IconBtn({ icon, onClick, color, border, disabled }: { icon: React.ReactNode; onClick?: () => void; color: string; border?: string; disabled?: boolean }) {
  return (
    <button disabled={disabled} onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-glass)', border: `1px solid ${border || 'var(--border)'}`, borderRadius: 'var(--radius-md)', padding: '9px 11px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1, color, fontSize: 12 }}>
      {icon}
    </button>
  )
}