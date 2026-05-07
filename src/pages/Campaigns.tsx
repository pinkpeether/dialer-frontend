import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Megaphone, Plus, Play, Pause, Copy, Trash2, X } from 'lucide-react'
import { useCampaigns } from '../hooks/useCampaigns'
import StatsCard        from '../components/StatsCard'


const COL_PINK   = '#fb0b8c'
const COL_GREEN  = '#00a747'
const COL_PURPLE = '#8057d7'
const COL_GOLD   = '#f0b90b'

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  DRAFT:     { color: 'var(--text-3)', bg: 'var(--bg-2)'   },
  ACTIVE:    { color: COL_GREEN,    bg: 'rgba(0,167,71,0.10)' },
  PAUSED:    { color: COL_GOLD,    bg: 'rgba(240,185,11,0.12)' },
  COMPLETED: { color: COL_PURPLE, bg: 'rgba(128,87,215,0.12)'  },
}


const FALLBACK_CAMPAIGN_STATS = { total: 6, active: 3, paused: 1, draft: 1, completed: 1 }

const FALLBACK_CAMPAIGNS: Record<string, unknown>[] = [
  { id: 1, name: 'Q2 Outbound Push', description: 'Cold outreach for Q2 enterprise pipeline', status: 'ACTIVE', dialRatio: 3, maxRetries: 4, timezone: 'America/New_York' },
  { id: 2, name: 'Renewals Sweep', description: 'Annual renewal touchpoints for tier-1 list', status: 'PAUSED', dialRatio: 2, maxRetries: 3, timezone: 'Europe/London' },
  { id: 3, name: 'Winback October', description: 'Reactivate dormant accounts (90+ days)', status: 'DRAFT', dialRatio: 5, maxRetries: 5, timezone: 'Asia/Karachi' },
  { id: 4, name: 'Demo Follow-ups', description: 'Auto-follow ups post-demo within 24h', status: 'ACTIVE', dialRatio: 2, maxRetries: 2, timezone: 'America/Chicago' },
  { id: 5, name: 'Pilot Conversion', description: 'Convert pilot users to paid plans', status: 'COMPLETED', dialRatio: 4, maxRetries: 4, timezone: 'America/Los_Angeles' },
  { id: 6, name: 'Event Registration', description: 'Reach out to event registrants', status: 'ACTIVE', dialRatio: 3, maxRetries: 3, timezone: 'Asia/Karachi' },
]

const inputStyle: React.CSSProperties = {
  padding: '11px 14px',
  background: 'var(--bg-glass-hi)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  fontSize: 13, outline: 'none', width: '100%',
  backdropFilter: 'blur(8px)',
}

export default function Campaigns() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', dialRatio: 3, script: '', timezone: 'Asia/Karachi',
  })

  const { campaigns, stats, loading, createCampaign, updateStatus, cloneCampaign, deleteCampaign } =
    useCampaigns()

  const visibleCampaigns = campaigns.length > 0 ? campaigns : FALLBACK_CAMPAIGNS
  const visibleStats = stats || FALLBACK_CAMPAIGN_STATS

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createCampaign(form as never)
      setShowForm(false)
      setForm({ name: '', description: '', dialRatio: 3, script: '', timezone: 'Asia/Karachi' })
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message || 'Error')
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
          <div className="eyebrow pink" style={{ marginBottom: 14 }}>
            <Megaphone size={11}/> PTDT-Dialer Campaigns
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
            Campaign <span className="gradient-brand-text">Management</span>
          </h1>
          <p style={{
            fontSize: 14.5, color: 'var(--text-3)', display: 'flex',
            alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}>
            <span className="pulse-dot pink"/> Create and orchestrate PTDT-Dialer outbound campaigns.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowForm(p => !p)}
          className="btn-brand"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            borderRadius: 'var(--radius-full)', padding: '0 22px',
            fontSize: 13.5, minHeight: 46,
          }}
        >
          {showForm ? <X size={15}/> : <Plus size={15}/>} {showForm ? 'Cancel' : 'New Campaign'}
        </motion.button>
      </motion.div>

      {/* Stats */}
      {visibleStats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 14, marginBottom: 28,
        }}>
          {[
            { label: 'Total',     value: Number(visibleStats.total),     color: COL_PINK,     bg: 'rgba(251,11,140,0.10)'  },
            { label: 'Active',    value: Number(visibleStats.active),    color: COL_GREEN,    bg: 'rgba(0,167,71,0.10)' },
            { label: 'Paused',    value: Number(visibleStats.paused),    color: COL_GOLD,    bg: 'rgba(240,185,11,0.12)' },
            { label: 'Draft',     value: Number(visibleStats.draft),     color: COL_PURPLE, bg: 'rgba(128,87,215,0.12)'   },
            { label: 'Completed', value: Number(visibleStats.completed), color: COL_PURPLE, bg: 'rgba(128,87,215,0.12)'  },
          ].map((s, i) => (
            <StatsCard key={i} index={i} label={s.label} value={s.value}
              icon={<Megaphone size={16}/>} color={s.color} bg={s.bg}/>
          ))}
        </div>
      )}

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreate}
            className="glass"
            style={{ padding: 24, marginBottom: 24, overflow: 'hidden' }}
          >
            <h3 className="display" style={{
              fontSize: 17, fontWeight: 700, color: 'var(--text)',
              marginBottom: 18, letterSpacing: '-0.01em',
            }}>
              New Campaign
            </h3>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              gap: 12, marginBottom: 12,
            }}>
              <input placeholder="Campaign Name" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                required style={inputStyle}/>
              <input placeholder="Description" value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                style={inputStyle}/>
              <input type="number" placeholder="Dial Ratio" value={form.dialRatio}
                onChange={e => setForm(p => ({ ...p, dialRatio: Number(e.target.value) }))}
                style={inputStyle} min={1} max={10}/>
              <select value={form.timezone}
                onChange={e => setForm(p => ({ ...p, timezone: e.target.value }))}
                style={inputStyle}>
                <option value="Asia/Karachi">Asia/Karachi</option>
                <option value="America/New_York">America/New_York</option>
                <option value="America/Chicago">America/Chicago</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
                <option value="Europe/London">Europe/London</option>
              </select>
              <textarea placeholder="Call Script…" value={form.script}
                onChange={e => setForm(p => ({ ...p, script: e.target.value }))}
                rows={3}
                style={{ ...inputStyle, gridColumn: 'span 2', resize: 'vertical' }}/>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn-brand" style={{
                borderRadius: 'var(--radius-md)', padding: '10px 22px',
                fontSize: 13, color: '#fff',
              }}>
                Create Campaign
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{
                background: 'var(--bg-glass)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '10px 22px',
                color: 'var(--text-3)', fontSize: 13, fontWeight: 600,
              }}>
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Cards */}
      {loading && campaigns.length > 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-3)' }}>
          Loading campaigns…
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
        }}>
          {visibleCampaigns.map((c, i) => {
            const sc = STATUS_CONFIG[c.status as string] || STATUS_CONFIG.DRAFT
            return (
              <motion.div
                key={c.id as number}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass lift"
                style={{ padding: 22 }}
              >
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'flex-start', marginBottom: 10, gap: 10,
                }}>
                  <div className="display" style={{
                    fontSize: 16, fontWeight: 700, color: 'var(--text)',
                    letterSpacing: '-0.01em',
                  }}>
                    {c.name as string}
                  </div>
                  <span className="badge" style={{
                    color: sc.color, background: sc.bg,
                    border: `1px solid ${sc.color}`,
                    flexShrink: 0,
                  }}>
                    {c.status as string}
                  </span>
                </div>
                <p style={{
                  fontSize: 12.5, color: 'var(--text-3)',
                  marginBottom: 16, lineHeight: 1.5,
                  minHeight: 36,
                }}>
                  {c.description as string || 'No description provided'}
                </p>

                <div style={{
                  display: 'flex', gap: 12, fontSize: 11.5,
                  color: 'var(--text-3)', marginBottom: 16,
                  paddingTop: 14, borderTop: '1px solid var(--border)',
                }}>
                  <span>Ratio <b className="mono" style={{ color: 'var(--text)' }}>{c.dialRatio as number}x</b></span>
                  <span>Retries <b className="mono" style={{ color: 'var(--text)' }}>{c.maxRetries as number}</b></span>
                  <span>TZ <b style={{ color: 'var(--text)' }}>{(c.timezone as string)?.split('/')[1]}</b></span>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  {c.status === 'DRAFT' && (
                    <ActionBtn onClick={() => updateStatus(c.id as number, 'ACTIVE')}
                      icon={<Play size={12}/>} label="Activate"
                      color="var(--green-2)" bg="rgba(0,167,71,0.10)"/>
                  )}
                  {c.status === 'ACTIVE' && (
                    <ActionBtn onClick={() => updateStatus(c.id as number, 'PAUSED')}
                      icon={<Pause size={12}/>} label="Pause"
                      color="var(--warning)" bg="rgba(240,185,11,0.12)"/>
                  )}
                  {c.status === 'PAUSED' && (
                    <ActionBtn onClick={() => updateStatus(c.id as number, 'ACTIVE')}
                      icon={<Play size={12}/>} label="Resume"
                      color="var(--green-2)" bg="rgba(0,167,71,0.10)"/>
                  )}
                  <IconBtn onClick={() => cloneCampaign(c.id as number)}
                    icon={<Copy size={12}/>} color="var(--text-3)"/>
                  <IconBtn
                    onClick={() => { if (confirm('Delete campaign?')) deleteCampaign(c.id as number) }}
                    icon={<Trash2 size={12}/>} color="var(--danger)" border="rgba(239,68,68,0.32)"/>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ActionBtn({
  icon, label, onClick, color, bg,
}: { icon: React.ReactNode; label: string; onClick?: () => void; color: string; bg: string }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      background: bg, border: `1px solid ${color}`,
      borderRadius: 'var(--radius-md)', padding: '9px',
      cursor: 'pointer', color, fontSize: 12, fontWeight: 600,
    }}>
      {icon} {label}
    </button>
  )
}

function IconBtn({
  icon, onClick, color, border,
}: { icon: React.ReactNode; onClick?: () => void; color: string; border?: string }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 4,
      background: 'var(--bg-glass)',
      border: `1px solid ${border || 'var(--border)'}`,
      borderRadius: 'var(--radius-md)', padding: '9px 11px',
      cursor: 'pointer', color, fontSize: 12,
    }}>
      {icon}
    </button>
  )
}
