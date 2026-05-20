import { useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Eye, Megaphone, Pause, Play, Plus, Trash2, X } from 'lucide-react'
import { useCampaigns } from '../hooks/useCampaigns'
import StatsCard from '../components/StatsCard'

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

const FALLBACK_CAMPAIGN_STATS = { total: 6, active: 3, paused: 1, draft: 1, completed: 1 }

const FALLBACK_CAMPAIGNS: Record<string, unknown>[] = [
  { id: 1, name: 'Q2 Outbound Push', description: 'Cold outreach for Q2 enterprise pipeline', status: 'ACTIVE', dialingRatio: 3, maxRetries: 4, timezone: 'America/New_York' },
  { id: 2, name: 'Renewals Sweep', description: 'Annual renewal touchpoints for tier-1 list', status: 'PAUSED', dialingRatio: 2, maxRetries: 3, timezone: 'Europe/London' },
  { id: 3, name: 'Winback October', description: 'Reactivate dormant accounts (90+ days)', status: 'DRAFT', dialingRatio: 5, maxRetries: 5, timezone: 'Asia/Karachi' },
  { id: 4, name: 'Demo Follow-ups', description: 'Auto-follow ups post-demo within 24h', status: 'ACTIVE', dialingRatio: 2, maxRetries: 2, timezone: 'America/Chicago' },
  { id: 5, name: 'Pilot Conversion', description: 'Convert pilot users to paid plans', status: 'COMPLETED', dialingRatio: 4, maxRetries: 4, timezone: 'America/Los_Angeles' },
  { id: 6, name: 'Event Registration', description: 'Reach out to event registrants', status: 'ACTIVE', dialingRatio: 3, maxRetries: 3, timezone: 'Asia/Karachi' },
]

const inputStyle: CSSProperties = {
  padding: '11px 14px',
  background: 'var(--bg-glass-hi)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text)',
  fontSize: 13,
  outline: 'none',
  width: '100%',
  backdropFilter: 'blur(8px)',
}

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
  const [form, setForm] = useState({
    name: '',
    description: '',
    dialingRatio: 3,
    script: '',
    timezone: 'Asia/Karachi',
  })

  const { campaigns, stats, loading, createCampaign, updateStatus, cloneCampaign, deleteCampaign } = useCampaigns()

  const visibleCampaigns = campaigns.length > 0 ? campaigns : FALLBACK_CAMPAIGNS
  const visibleStats = stats || FALLBACK_CAMPAIGN_STATS

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await createCampaign(form)
      setShowForm(false)
      setForm({ name: '', description: '', dialingRatio: 3, script: '', timezone: 'Asia/Karachi' })
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error')
    }
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1600, margin: '0 auto' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 32,
          gap: 18,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 14 }}>
            <Megaphone size={11} /> PTDT-Dialer Campaigns
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
            fontSize: 14.5,
            color: 'var(--text-3)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}>
            <span className="pulse-dot pink" /> Create, inspect, and orchestrate PTDT-Dialer outbound campaigns.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowForm(previous => !previous)}
          className="btn-brand"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            borderRadius: 'var(--radius-full)',
            padding: '0 22px',
            fontSize: 13.5,
            minHeight: 46,
          }}
        >
          {showForm ? <X size={15} /> : <Plus size={15} />} {showForm ? 'Cancel' : 'New Campaign'}
        </motion.button>
      </motion.div>

      {visibleStats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 14,
          marginBottom: 28,
        }}>
          {[
            { label: 'Total',     value: getNumber(visibleStats.total),     color: COL_PINK,   bg: 'rgba(251,11,140,0.10)' },
            { label: 'Active',    value: getNumber(visibleStats.active),    color: COL_GREEN,  bg: 'rgba(0,167,71,0.10)' },
            { label: 'Paused',    value: getNumber(visibleStats.paused),    color: COL_GOLD,   bg: 'rgba(240,185,11,0.12)' },
            { label: 'Draft',     value: getNumber(visibleStats.draft),     color: COL_PURPLE, bg: 'rgba(128,87,215,0.12)' },
            { label: 'Completed', value: getNumber(visibleStats.completed), color: COL_PURPLE, bg: 'rgba(128,87,215,0.12)' },
          ].map((item, index) => (
            <StatsCard
              key={item.label}
              index={index}
              label={item.label}
              value={item.value}
              icon={<Megaphone size={16} />}
              color={item.color}
              bg={item.bg}
            />
          ))}
        </div>
      )}

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
              fontSize: 17,
              fontWeight: 700,
              color: 'var(--text)',
              marginBottom: 18,
              letterSpacing: '-0.01em',
            }}>
              New Campaign
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 12,
              marginBottom: 12,
            }}>
              <input
                placeholder="Campaign Name"
                value={form.name}
                onChange={event => setForm(previous => ({ ...previous, name: event.target.value }))}
                required
                style={inputStyle}
              />
              <input
                placeholder="Description"
                value={form.description}
                onChange={event => setForm(previous => ({ ...previous, description: event.target.value }))}
                style={inputStyle}
              />
              <input
                type="number"
                placeholder="Dialing Ratio"
                value={form.dialingRatio}
                onChange={event => setForm(previous => ({ ...previous, dialingRatio: Number(event.target.value) }))}
                style={inputStyle}
                min={1}
                max={10}
              />
              <select
                value={form.timezone}
                onChange={event => setForm(previous => ({ ...previous, timezone: event.target.value }))}
                style={inputStyle}
              >
                <option value="Asia/Karachi">Asia/Karachi</option>
                <option value="America/New_York">America/New_York</option>
                <option value="America/Chicago">America/Chicago</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
                <option value="Europe/London">Europe/London</option>
              </select>
              <textarea
                placeholder="Call Script…"
                value={form.script}
                onChange={event => setForm(previous => ({ ...previous, script: event.target.value }))}
                rows={3}
                style={{ ...inputStyle, gridColumn: 'span 2', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn-brand" style={{
                borderRadius: 'var(--radius-md)',
                padding: '10px 22px',
                fontSize: 13,
                color: '#fff',
              }}>
                Create Campaign
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{
                background: 'var(--bg-glass)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 22px',
                color: 'var(--text-3)',
                fontSize: 13,
                fontWeight: 600,
              }}>
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

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
          {visibleCampaigns.map((campaign, index) => {
            const campaignId = getNumber(campaign.id)
            const campaignStatus = getText(campaign.status, 'DRAFT')
            const style = STATUS_CONFIG[campaignStatus] || STATUS_CONFIG.DRAFT
            const dialingRatio = getNumber(campaign.dialingRatio ?? campaign.dialRatio, 1)
            const maxRetries = getNumber(campaign.maxRetries, 3)
            const timezone = getText(campaign.timezone, 'UTC')

            return (
              <motion.div
                key={campaignId || index}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="glass lift"
                style={{ padding: 22 }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 10,
                  gap: 10,
                }}>
                  <div className="display" style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--text)',
                    letterSpacing: '-0.01em',
                  }}>
                    {getText(campaign.name, 'Untitled Campaign')}
                  </div>
                  <span className="badge" style={{
                    color: style.color,
                    background: style.bg,
                    border: `1px solid ${style.color}`,
                    flexShrink: 0,
                  }}>
                    {campaignStatus}
                  </span>
                </div>
                <p style={{
                  fontSize: 12.5,
                  color: 'var(--text-3)',
                  marginBottom: 14,
                  lineHeight: 1.5,
                  minHeight: 36,
                }}>
                  {getText(campaign.description, 'No description provided')}
                </p>

                {/* Progress bar */}
                {(() => {
                  const total = getNumber(campaign.totalContacts ?? campaign.contactCount, 0)
                  const answered = getNumber(campaign.answeredCount ?? campaign.contacted, 0)
                  const failed = getNumber(campaign.failedCount ?? campaign.failed, 0)
                  const pending = getNumber(campaign.pendingCount ?? campaign.pending, total - answered - failed)
                  const processed = answered + failed
                  const pct = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0

                  return total > 0 ? (
                    <div style={{ marginBottom: 14 }}>
                      {/* Bar */}
                      <div style={{ height: 7, borderRadius: 999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 7 }}>
                        <div style={{
                          height: '100%', width: `${pct}%`, borderRadius: 999,
                          background: 'linear-gradient(90deg, var(--pink), var(--green-2))',
                          transition: 'width 0.6s ease',
                          boxShadow: '0 0 10px rgba(251,11,140,0.28)',
                        }} />
                      </div>
                      {/* Counters */}
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10.5, color: COL_GREEN, fontWeight: 700 }}>✓ {answered} answered</span>
                        <span style={{ fontSize: 10.5, color: COL_GOLD, fontWeight: 700 }}>◷ {pending} pending</span>
                        <span style={{ fontSize: 10.5, color: 'rgba(255,59,95,0.80)', fontWeight: 700 }}>✕ {failed} failed</span>
                        <span style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 700 }}>{pct}% done</span>
                      </div>
                    </div>
                  ) : null
                })()}

                <div style={{
                  display: 'flex',
                  gap: 12,
                  fontSize: 11.5,
                  color: 'var(--text-3)',
                  marginBottom: 16,
                  paddingTop: 14,
                  borderTop: '1px solid var(--border)',
                }}>
                  <span>Ratio <b className="mono" style={{ color: 'var(--text)' }}>{dialingRatio}x</b></span>
                  <span>Retries <b className="mono" style={{ color: 'var(--text)' }}>{maxRetries}</b></span>
                  <span>TZ <b style={{ color: 'var(--text)' }}>{timezone.split('/')[1] || timezone}</b></span>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <ActionBtn
                    onClick={() => navigate(`/campaigns/${campaignId}`)}
                    icon={<Eye size={12} />}
                    label="Details"
                    color="var(--pink)"
                    bg="rgba(251,11,140,0.10)"
                  />
                  {campaignStatus === 'DRAFT' && (
                    <ActionBtn
                      onClick={() => updateStatus(campaignId, 'ACTIVE')}
                      icon={<Play size={12} />}
                      label="Activate"
                      color="var(--green-2)"
                      bg="rgba(0,167,71,0.10)"
                    />
                  )}
                  {campaignStatus === 'ACTIVE' && (
                    <ActionBtn
                      onClick={() => updateStatus(campaignId, 'PAUSED')}
                      icon={<Pause size={12} />}
                      label="Pause"
                      color="var(--warning)"
                      bg="rgba(240,185,11,0.12)"
                    />
                  )}
                  {campaignStatus === 'PAUSED' && (
                    <ActionBtn
                      onClick={() => updateStatus(campaignId, 'ACTIVE')}
                      icon={<Play size={12} />}
                      label="Resume"
                      color="var(--green-2)"
                      bg="rgba(0,167,71,0.10)"
                    />
                  )}
                  <IconBtn onClick={() => cloneCampaign(campaignId)} icon={<Copy size={12} />} color="var(--text-3)" />
                  <IconBtn
                    onClick={() => { if (confirm('Delete campaign?')) void deleteCampaign(campaignId) }}
                    icon={<Trash2 size={12} />}
                    color="var(--danger)"
                    border="rgba(239,68,68,0.32)"
                  />
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
  icon,
  label,
  onClick,
  color,
  bg,
}: {
  icon: ReactNode
  label: string
  onClick?: () => void
  color: string
  bg: string
}) {
  return (
    <button onClick={onClick} style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      background: bg,
      border: `1px solid ${color}`,
      borderRadius: 'var(--radius-md)',
      padding: '9px',
      cursor: 'pointer',
      color,
      fontSize: 12,
      fontWeight: 600,
      minWidth: 94,
    }}>
      {icon} {label}
    </button>
  )
}

function IconBtn({
  icon,
  onClick,
  color,
  border,
}: {
  icon: ReactNode
  onClick?: () => void
  color: string
  border?: string
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      background: 'var(--bg-glass)',
      border: `1px solid ${border || 'var(--border)'}`,
      borderRadius: 'var(--radius-md)',
      padding: '9px 11px',
      cursor: 'pointer',
      color,
      fontSize: 12,
    }}>
      {icon}
    </button>
  )
}
