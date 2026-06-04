import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Search, Trash2, X } from 'lucide-react'
import { useAgents } from '../hooks/useAgents'
import StatsCard     from '../components/StatsCard'


const COL_PINK   = '#fb0b8c'
const COL_GREEN  = '#00a747'
const COL_PURPLE = '#8057d7'
const COL_GOLD   = '#f0b90b'
const COL_DANGER = '#ef4444'

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  ONLINE:  { color: COL_GREEN,    bg: 'rgba(0,167,71,0.10)' },
  READY:   { color: COL_PURPLE, bg: 'rgba(128,87,215,0.12)'  },
  BUSY:    { color: COL_GOLD,    bg: 'rgba(240,185,11,0.12)' },
  WRAP_UP: { color: COL_PINK,       bg: 'rgba(251,11,140,0.10)'    },
  OFFLINE: { color: 'var(--text-3)', bg: 'var(--bg-2)'   },
}


const FALLBACK_AGENT_STATS = { total: 7, online: 2, ready: 2, busy: 1, offline: 1 }

const FALLBACK_AGENTS: Record<string, unknown>[] = [
  { id: 1, name: 'Aisha Khan', email: 'aisha@jd.com', role: 'AGENT', agentCode: 'JD-101', status: 'ONLINE' },
  { id: 2, name: 'Marcus Reed', email: 'marcus@jd.com', role: 'AGENT', agentCode: 'JD-102', status: 'READY' },
  { id: 3, name: 'Sara Liu', email: 'sara@jd.com', role: 'SUPERVISOR', agentCode: 'JD-103', status: 'BUSY' },
  { id: 4, name: 'David Okafor', email: 'david@jd.com', role: 'AGENT', agentCode: 'JD-104', status: 'WRAP_UP' },
  { id: 5, name: 'Mei Tanaka', email: 'mei@jd.com', role: 'AGENT', agentCode: 'JD-105', status: 'OFFLINE' },
  { id: 6, name: 'Carlos Vega', email: 'carlos@jd.com', role: 'AGENT', agentCode: 'JD-106', status: 'ONLINE' },
  { id: 7, name: 'Hannah Schmidt', email: 'hannah@jd.com', role: 'AGENT', agentCode: 'JD-107', status: 'READY' },
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

export default function Agents() {
  const [search,   setSearch]   = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'AGENT', extension: '', phone: '',
  })

  const { agents, stats, loading, createAgent, deleteAgent } =
    useAgents({ search: search || undefined })

  const sourceAgents = agents.length > 0 ? agents : FALLBACK_AGENTS
  const visibleAgents = sourceAgents.filter(agent => {
    if (!search) return true
    const q = search.toLowerCase()
    return String(agent.name || '').toLowerCase().includes(q) ||
      String(agent.email || '').toLowerCase().includes(q) ||
      String(agent.agentCode || '').toLowerCase().includes(q)
  })
  const visibleStats = stats || FALLBACK_AGENT_STATS

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createAgent(form as never)
      setShowForm(false)
      setForm({ name: '', email: '', password: '', role: 'AGENT', extension: '', phone: '' })
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message || 'Error creating agent')
    }
  }

  return (
    <div className="ptdt-page">

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
            <Users size={11}/> PTDT-Dialer Access
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
            Agent <span className="gradient-brand-text">Management</span>
          </h1>
          <p style={{
            fontSize: 14.5, color: 'var(--text-3)', display: 'flex',
            alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}>
            <span className="pulse-dot pink"/> Manage PTDT-Dialer agents, access, roles and live availability.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
          onClick={() => setShowForm(p => !p)}
          className="btn-brand"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            borderRadius: 'var(--radius-full)', padding: '0 22px',
            fontSize: 13.5, minHeight: 46,
          }}
        >
          {showForm ? <X size={15}/> : <Plus size={15}/>} {showForm ? 'Cancel' : 'Add Agent'}
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
            { label: 'Total',   value: Number(visibleStats.total),   color: COL_PINK,     bg: 'rgba(251,11,140,0.10)'  },
            { label: 'Online',  value: Number(visibleStats.online),  color: COL_GREEN,    bg: 'rgba(0,167,71,0.10)' },
            { label: 'Ready',   value: Number(visibleStats.ready),   color: COL_PURPLE, bg: 'rgba(128,87,215,0.12)'  },
            { label: 'Busy',    value: Number(visibleStats.busy),    color: COL_GOLD,    bg: 'rgba(240,185,11,0.12)' },
            { label: 'Offline', value: Number(visibleStats.offline), color: COL_PURPLE, bg: 'rgba(128,87,215,0.12)'   },
          ].map((s, i) => (
            <StatsCard key={i} index={i} label={s.label} value={s.value}
              icon={<Users size={16}/>} color={s.color} bg={s.bg}/>
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
              New Agent
            </h3>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12, marginBottom: 14,
            }}>
              {[
                { key: 'name',      placeholder: 'Full Name',   type: 'text'     },
                { key: 'email',     placeholder: 'Email',       type: 'email'    },
                { key: 'password',  placeholder: 'Password',    type: 'password' },
                { key: 'extension', placeholder: 'Extension',   type: 'text'     },
                { key: 'phone',     placeholder: 'Phone',       type: 'text'     },
              ].map(f => (
                <input
                  key={f.key} type={f.type} placeholder={f.placeholder}
                  value={(form as Record<string, string>)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  required={['name', 'email', 'password'].includes(f.key)}
                  style={inputStyle}
                />
              ))}
              <select value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                style={inputStyle}>
                <option value="AGENT">Agent</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn-brand" style={{
                borderRadius: 'var(--radius-md)', padding: '10px 22px',
                fontSize: 13, color: '#fff',
              }}>
                Create Agent
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

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 320 }}>
        <Search size={14} color="var(--text-3)" style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
        }}/>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search agents…"
          style={{ ...inputStyle, paddingLeft: 36 }}/>
      </div>

      {/* Table */}
      <div className="glass" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr style={{ background: 'var(--bg-glass)' }}>
                {['#', 'Agent', 'Email', 'Role', 'Status', 'Actions'].map(h => (
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
              {loading && agents.length > 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
                  Loading agents…
                </td></tr>
              ) : visibleAgents.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
                  No agents found
                </td></tr>
              ) : visibleAgents.map((agent, i) => {
                const sc = STATUS_COLORS[agent.status as string] || STATUS_COLORS.OFFLINE
                return (
                  <motion.tr
                    key={agent.id as number}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
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
                          width: 34, height: 34, borderRadius: '50%',
                          background: 'var(--grad-brand)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 700, color: '#fff',
                          boxShadow: '0 0 12px rgba(251,11,140,0.32)',
                        }}>
                          {(agent.name as string)?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{
                            fontSize: 13.5, fontWeight: 600, color: 'var(--text)',
                          }}>
                            {agent.name as string}
                          </div>
                          <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                            {agent.agentCode as string}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{
                      padding: '14px 16px', fontSize: 13, color: 'var(--text-2)',
                    }}>
                      {agent.email as string}
                    </td>
                    <td style={{
                      padding: '14px 16px', fontSize: 12, color: 'var(--text-3)',
                      fontWeight: 600,
                    }}>
                      {agent.role as string}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="badge" style={{
                        color: sc.color, background: sc.bg,
                        border: `1px solid ${sc.color}`,
                      }}>
                        {agent.status as string}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={() => { if (confirm('Delete this agent?')) deleteAgent(agent.id as number) }}
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
