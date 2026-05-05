import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Search, Trash2, X } from 'lucide-react'
import { useAgents } from '../hooks/useAgents'
import StatsCard     from '../components/StatsCard'

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  ONLINE:  { color: 'var(--success)',    bg: 'var(--success-bg)' },
  READY:   { color: 'var(--accent)',     bg: 'var(--accent-bg)'  },
  BUSY:    { color: 'var(--warning)',    bg: 'var(--warning-bg)' },
  WRAP_UP: { color: 'var(--pink)',       bg: 'var(--pink-bg)'    },
  OFFLINE: { color: 'var(--text-muted)', bg: 'var(--bg-hover)'   },
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

export default function Agents() {
  const [search,   setSearch]   = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'AGENT', extension: '', phone: '',
  })

  const { agents, stats, loading, createAgent, deleteAgent } =
    useAgents({ search: search || undefined })

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
            Agent <span className="gradient-brand-text">Management</span>
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
            Manage your dialer agents and their access
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => setShowForm(p => !p)}
          className="btn-brand"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            borderRadius: 'var(--radius-lg)', padding: '11px 22px',
            fontSize: 13.5,
          }}
        >
          {showForm ? <X size={15}/> : <Plus size={15}/>}
          {showForm ? 'Cancel' : 'Add Agent'}
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
            { label: 'Total',   value: Number(stats.total),   color: 'var(--accent)',     bg: 'var(--accent-bg)'  },
            { label: 'Online',  value: Number(stats.online),  color: 'var(--success)',    bg: 'var(--success-bg)' },
            { label: 'Ready',   value: Number(stats.ready),   color: 'var(--cyan)',       bg: 'var(--accent-bg)'  },
            { label: 'Busy',    value: Number(stats.busy),    color: 'var(--warning)',    bg: 'var(--warning-bg)' },
            { label: 'Offline', value: Number(stats.offline), color: 'var(--text-muted)', bg: 'var(--bg-hover)'   },
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
              fontSize: 17, fontWeight: 700, color: 'var(--text-primary)',
              marginBottom: 18, letterSpacing: '-0.01em',
            }}>
              New Agent
            </h3>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
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

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 320 }}>
        <Search size={14} color="var(--text-muted)" style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
        }}/>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search agents…"
          style={{ ...inputStyle, paddingLeft: 36 }}/>
      </div>

      {/* Table */}
      <div className="glass" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-glass)' }}>
                {['#', 'Agent', 'Email', 'Role', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '13px 16px', textAlign: 'left',
                    fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: 1,
                    borderBottom: '1px solid var(--border)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  Loading agents…
                </td></tr>
              ) : agents.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  No agents found
                </td></tr>
              ) : agents.map((agent, i) => {
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
                      padding: '14px 16px', fontSize: 12, color: 'var(--text-muted)',
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
                          boxShadow: '0 0 12px var(--accent-glow)',
                        }}>
                          {(agent.name as string)?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{
                            fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)',
                          }}>
                            {agent.name as string}
                          </div>
                          <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {agent.agentCode as string}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{
                      padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)',
                    }}>
                      {agent.email as string}
                    </td>
                    <td style={{
                      padding: '14px 16px', fontSize: 12, color: 'var(--text-muted)',
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
                          border: '1px solid var(--border-danger)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '6px 10px',
                          cursor: 'pointer', color: 'var(--danger)',
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
