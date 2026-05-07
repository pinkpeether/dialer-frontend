import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Phone, Users, Megaphone, TrendingUp, Activity, Radio,
  ArrowUpRight, BookUser, Sparkles,
} from 'lucide-react'
import { agentsAPI }        from '../api/agents.api'
import { campaignsAPI }     from '../api/campaigns.api'
import { contactsAPI }      from '../api/contacts.api'
import { useAuthStore }     from '../store/auth.store'
import { useLiveDashboard } from '../hooks/useLiveDashboard'
import StatsCard            from '../components/StatsCard'

interface Stats {
  agents:    { total: number; online: number; ready: number; busy: number }
  campaigns: { total: number; active: number; paused: number }
  contacts:  { total: number; pending: number; answered: number; answerRate: number }
}

// Brand color palette — pink primary, green/purple/gold secondary
const COL_PINK   = '#fb0b8c'
const COL_GREEN  = '#00a747'
const COL_PURPLE = '#8057d7'
const COL_GOLD   = '#f0b90b'

export default function Dashboard() {
  const user = useAuthStore(s => s.user)
  const [stats, setStats] = useState<Stats | null>(null)
  const { activeCalls, recentCalls } = useLiveDashboard()

  useEffect(() => {
    const load = async () => {
      const [a, c, ct] = await Promise.all([
        agentsAPI.getStats(),
        campaignsAPI.getStats(),
        contactsAPI.getStats(),
      ])
      setStats({ agents: a, campaigns: c, contacts: ct })
    }
    load()
  }, [])

  const cards = stats ? [
    { label: 'Total Agents',     value: stats.agents.total,
      sub: `${stats.agents.online} online · ${stats.agents.ready} ready`,
      icon: <Users size={18}/>,      color: COL_PINK,   bg: 'rgba(251,11,140,0.10)' },
    { label: 'Active Campaigns', value: stats.campaigns.active,
      sub: `${stats.campaigns.total} total campaigns`,
      icon: <Megaphone size={18}/>,  color: COL_GREEN,  bg: 'rgba(0,167,71,0.10)' },
    { label: 'Total Contacts',   value: stats.contacts.total,
      sub: `${stats.contacts.pending} pending`,
      icon: <Phone size={18}/>,      color: COL_PURPLE, bg: 'rgba(128,87,215,0.10)' },
    { label: 'Answer Rate',      value: `${stats.contacts.answerRate ?? 0}%`,
      sub: `${stats.contacts.answered} answered`,
      icon: <TrendingUp size={18}/>, color: COL_GOLD,   bg: 'rgba(240,185,11,0.10)' },
  ] : []

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1600, margin: '0 auto' }}>

      {/* ===== Hero header ===== */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 32 }}
      >
        <div className="eyebrow pink" style={{ marginBottom: 14 }}>
          <Sparkles size={11}/> Live operations
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(28px, 3.4vw, 42px)',
          fontWeight: 900, lineHeight: 1.05,
          letterSpacing: '-0.04em',
          marginBottom: 10,
          color: 'var(--text)',
        }}>
          {greeting},{' '}
          <span className="gradient-brand-text">{user?.name?.split(' ')[0] || 'Operator'}</span>
        </h1>

        <p style={{
          fontSize: 14.5, color: 'var(--text-3)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span className="pulse-dot"/>
          Pipeline online · monitoring {activeCalls.length} live call{activeCalls.length === 1 ? '' : 's'}
        </p>
      </motion.div>

      {/* ===== Stats grid ===== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16, marginBottom: 28,
      }}>
        {cards.map((card, i) => (
          <StatsCard key={i} index={i} {...card}/>
        ))}
      </div>

      {/* ===== Live row ===== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 16,
      }}>

        {/* --- Active calls --- */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass"
          style={{ padding: 24, borderRadius: 20 }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12,
              background: 'rgba(0,167,71,0.10)',
              border: '1px solid rgba(0,167,71,0.32)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0,167,71,0.18)',
            }}>
              <Radio size={16} color={COL_GREEN}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 15, fontWeight: 800, color: 'var(--text)',
                letterSpacing: '-0.02em',
              }}>
                Live Calls
              </div>
              <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2, fontWeight: 600 }}>
                Real-time pipeline
              </div>
            </div>
            {activeCalls.length > 0 && (
              <span className="badge badge-answered">
                <span className="pulse-dot" /> {activeCalls.length} active
              </span>
            )}
          </div>

          {activeCalls.length === 0 ? (
            <div style={{
              padding: '32px 0', textAlign: 'center',
              color: 'var(--text-3)', fontSize: 13,
            }}>
              No active calls right now
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeCalls.map(call => (
                <motion.div
                  key={call.callId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{
                    padding: '12px 14px',
                    background: 'var(--bg-glass)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}
                >
                  <span className="pulse-dot"/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>
                      {call.name}
                    </div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                      {call.phone} → {call.agentName}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* --- Recent calls --- */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="glass"
          style={{ padding: 24, borderRadius: 20 }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12,
              background: 'rgba(251,11,140,0.10)',
              border: '1px solid rgba(251,11,140,0.32)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(251,11,140,0.18)',
            }}>
              <Activity size={16} color={COL_PINK}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 15, fontWeight: 800, color: 'var(--text)',
                letterSpacing: '-0.02em',
              }}>
                Recent Calls
              </div>
              <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2, fontWeight: 600 }}>
                Last activity feed
              </div>
            </div>
          </div>

          {recentCalls.length === 0 ? (
            <div style={{
              padding: '32px 0', textAlign: 'center',
              color: 'var(--text-3)', fontSize: 13,
            }}>
              No recent calls yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <AnimatePresence>
                {recentCalls.slice(0, 8).map((call, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: i < Math.min(recentCalls.length, 8) - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: 12.5, color: 'var(--text-2)', fontWeight: 600 }}>
                      Agent #{call.agentId}
                    </span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      {call.duration ? `${call.duration}s` : '—'}
                    </span>
                    <span className={`badge ${call.status === 'ANSWERED' ? 'badge-answered' : 'badge-noanswer'}`}>
                      {call.status}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* --- Quick actions --- */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
          className="glass"
          style={{ padding: 24, borderRadius: 20 }}
        >
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 15, fontWeight: 800, color: 'var(--text)',
            letterSpacing: '-0.02em',
            marginBottom: 18,
          }}>
            Quick Actions
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Open Dialer',     href: '/dialer',    icon: Phone,     color: COL_PINK   },
              { label: 'New Campaign',    href: '/campaigns', icon: Megaphone, color: COL_GREEN  },
              { label: 'Upload Contacts', href: '/contacts',  icon: BookUser,  color: COL_PURPLE },
              { label: 'Manage Agents',   href: '/agents',    icon: Users,     color: COL_GOLD   },
            ].map(a => {
              const Icon = a.icon
              return (
                <motion.a
                  key={a.href}
                  href={a.href}
                  whileHover={{ x: 3 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px',
                    background: 'var(--bg-glass)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    fontSize: 13.5, fontWeight: 700,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = a.color
                    e.currentTarget.style.background = `${a.color}10`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.background = 'var(--bg-glass)'
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${a.color}22`, color: a.color,
                  }}>
                    <Icon size={14}/>
                  </div>
                  <span style={{ flex: 1 }}>{a.label}</span>
                  <ArrowUpRight size={14} color="var(--text-3)"/>
                </motion.a>
              )
            })}
          </div>
        </motion.div>
      </div>
    </div>
  )
}