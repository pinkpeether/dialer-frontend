import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Megaphone, Plus, Play, Pause, Copy, Trash2, X } from 'lucide-react'
import { useCampaigns } from '../hooks/useCampaigns'
import StatsCard        from '../components/StatsCard'

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  DRAFT:     { color: 'var(--text-muted)', bg: 'var(--bg-hover)'   },
  ACTIVE:    { color: 'var(--success)',    bg: 'var(--success-bg)' },
  PAUSED:    { color: 'var(--warning)',    bg: 'var(--warning-bg)' },
  COMPLETED: { color: 'var(--accent)',     bg: 'var(--accent-bg)'  },
}

const inputStyle: React.CSSProperties = {
  padding: '11px 14px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-input)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
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
            Campaign <span className="gradient-brand-text">Management</span>
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
            Create and orchestrate dialing campaigns
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowForm(p => !p)}
          className="btn-brand"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            borderRadius: 'var(--radius-lg)', padding: '11px 22px',
            fontSize: 13.5,
          }}
        >
          {showForm ? <X size={15}/> : <Plus size={15}/>}
          {showForm ? 'Cancel' : 'New Campaign'}
        </motion.button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 14, marginBottom: 28,
        }}>
          {[
            { label: 'Total',     value: Number(stats.total),     color: 'var(--accent)',     bg: 'var(--accent-bg)'  },
            { label: 'Active',    value: Number(stats.active),    color: 'var(--success)',    bg: 'var(--success-bg)' },
            { label: 'Paused',    value: Number(stats.paused),    color: 'var(--warning)',    bg: 'var(--warning-bg)' },
            { label: 'Draft',     value: Number(stats.draft),     color: 'var(--text-muted)', bg: 'var(--bg-hover)'   },
            { label: 'Completed', value: Number(stats.completed), color: 'var(--cyan)',       bg: 'var(--accent-bg)'  },
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
              fontSize: 17, fontWeight: 700, color: 'var(--text-primary)',
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
                border: '1px solid var(--border-input)',
                borderRadius: 'var(--radius-md)', padding: '10px 22px',
                color: 'var(--text-muted)', fontSize: 13, fontWeight: 600,
              }}>
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          Loading campaigns…
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
        }}>
          {campaigns.map((c, i) => {
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
                    fontSize: 16, fontWeight: 700, color: 'var(--text-primary)',
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
                  fontSize: 12.5, color: 'var(--text-muted)',
                  marginBottom: 16, lineHeight: 1.5,
                  minHeight: 36,
                }}>
                  {c.description as string || 'No description provided'}
                </p>

                <div style={{
                  display: 'flex', gap: 12, fontSize: 11.5,
                  color: 'var(--text-muted)', marginBottom: 16,
                  paddingTop: 14, borderTop: '1px solid var(--border)',
                }}>
                  <span>Ratio <b className="mono" style={{ color: 'var(--text-primary)' }}>{c.dialRatio as number}x</b></span>
                  <span>Retries <b className="mono" style={{ color: 'var(--text-primary)' }}>{c.maxRetries as number}</b></span>
                  <span>TZ <b style={{ color: 'var(--text-primary)' }}>{(c.timezone as string)?.split('/')[1]}</b></span>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  {c.status === 'DRAFT' && (
                    <ActionBtn onClick={() => updateStatus(c.id as number, 'ACTIVE')}
                      icon={<Play size={12}/>} label="Activate"
                      color="var(--success)" bg="var(--success-bg)"/>
                  )}
                  {c.status === 'ACTIVE' && (
                    <ActionBtn onClick={() => updateStatus(c.id as number, 'PAUSED')}
                      icon={<Pause size={12}/>} label="Pause"
                      color="var(--warning)" bg="var(--warning-bg)"/>
                  )}
                  {c.status === 'PAUSED' && (
                    <ActionBtn onClick={() => updateStatus(c.id as number, 'ACTIVE')}
                      icon={<Play size={12}/>} label="Resume"
                      color="var(--success)" bg="var(--success-bg)"/>
                  )}
                  <IconBtn onClick={() => cloneCampaign(c.id as number)}
                    icon={<Copy size={12}/>} color="var(--text-muted)"/>
                  <IconBtn
                    onClick={() => { if (confirm('Delete campaign?')) deleteCampaign(c.id as number) }}
                    icon={<Trash2 size={12}/>} color="var(--danger)" border="var(--border-danger)"/>
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
      border: `1px solid ${border || 'var(--border-input)'}`,
      borderRadius: 'var(--radius-md)', padding: '9px 11px',
      cursor: 'pointer', color, fontSize: 12,
    }}>
      {icon}
    </button>
  )
}
