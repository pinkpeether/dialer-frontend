import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Eye, Megaphone, Pause, Play, Plus, Trash2, X } from 'lucide-react'
import { useCampaigns } from '../hooks/useCampaigns'
import StatsCard from '../components/StatsCard'
import DialingModeSelector from '../components/dialing/DialingModeSelector'
import DialingModeBadge from '../components/dialing/DialingModeBadge'

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

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1600, margin: '0 auto' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 12 }}>
            <input placeholder="Campaign Name" value={form.name} onChange={event => setForm(previous => ({ ...previous, name: event.target.value }))} required style={inputStyle} />
            <input placeholder="Description" value={form.description} onChange={event => setForm(previous => ({ ...previous, description: event.target.value }))} style={inputStyle} />
            <input type="number" placeholder="Dialing Ratio" value={form.dialingRatio} onChange={event => setForm(previous => ({ ...previous, dialingRatio: Number(event.target.value) }))} style={inputStyle} min={1} max={10} />
            <DialingModeSelector value={form.mode} onChange={mode => setForm(previous => ({ ...previous, mode }))} />
            <select value={form.timezone} onChange={event => setForm(previous => ({ ...previous, timezone: event.target.value }))} style={inputStyle}>
              <option value="Asia/Karachi">Asia/Karachi</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
              <option value="America/Chicago">America/Chicago</option>
              <option value="America/Los_Angeles">America/Los_Angeles</option>
              <option value="Europe/London">Europe/London</option>
            </select>
            <textarea placeholder="Call Script…" value={form.script} onChange={event => setForm(previous => ({ ...previous, script: event.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
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
                  <IconBtn disabled={busyId === campaignId} onClick={() => { if (confirm('Delete campaign? This will remove its contacts and calls.')) void runAction(campaignId, () => deleteCampaign(campaignId)) }} icon={<Trash2 size={12} />} color="var(--danger)" border="rgba(239,68,68,0.32)" />
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