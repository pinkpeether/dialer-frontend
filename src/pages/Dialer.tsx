import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Phone, PhoneOff, Mic, MicOff, Play, Square,
  Power, Sparkles, Search,
} from 'lucide-react'
import { dialerAPI }    from '../api/dialer.api'
import { campaignsAPI } from '../api/campaigns.api'
import { contactsAPI }  from '../api/contacts.api'
import { useAuthStore } from '../store/auth.store'

export default function Dialer() {
  const user = useAuthStore(s => s.user)
  const [campaigns,    setCampaigns]    = useState<Record<string,unknown>[]>([])
  const [selectedCamp, setSelectedCamp] = useState<number | null>(null)
  const [contacts,     setContacts]     = useState<Record<string,unknown>[]>([])
  const [activeCall,   setActiveCall]   = useState<Record<string,unknown> | null>(null)
  const [isDialing,    setIsDialing]    = useState(false)
  const [muted,        setMuted]        = useState(false)
  const [elapsed,      setElapsed]      = useState(0)
  const [agentStatus,  setAgentStatus]  = useState<'OFFLINE'|'READY'>('OFFLINE')
  const [loading,      setLoading]      = useState(false)
  const [message,      setMessage]      = useState('')
  const [search,       setSearch]       = useState('')
  void user

  useEffect(() => {
    campaignsAPI.getAll({ status:'ACTIVE' }).then(d => setCampaigns(d.campaigns || []))
  }, [])

  useEffect(() => {
    if (!selectedCamp) return
    contactsAPI.getAll({ campaignId:selectedCamp, status:'PENDING', limit:100 })
      .then(d => setContacts(d.contacts || []))
  }, [selectedCamp])

  useEffect(() => {
    if (!activeCall) { setElapsed(0); return }
    const t = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [activeCall])

  const fmt = (s: number) =>
    `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  const handleStartCampaign = async () => {
    if (!selectedCamp) { setMessage('Select a campaign first'); return }
    setLoading(true)
    try {
      await dialerAPI.startCampaign(selectedCamp)
      setIsDialing(true)
      setMessage('✓ Campaign dialing started')
    } catch { setMessage('✕ Error starting campaign') }
    finally { setLoading(false) }
  }

  const handleStopCampaign = async () => {
    if (!selectedCamp) return
    await dialerAPI.stopCampaign(selectedCamp)
    setIsDialing(false); setActiveCall(null)
    setMessage('⏹ Campaign stopped')
  }

  const handleManualCall = async (contact: Record<string,unknown>) => {
    if (!selectedCamp) return
    setLoading(true)
    try {
      const result = await dialerAPI.makeManualCall(contact.id as number, selectedCamp)
      setActiveCall({ ...contact, callSid: result.callRecord.twilioCallSid })
      setMessage(`📞 Calling ${contact.phone}…`)
    } catch { setMessage('✕ Call failed') }
    finally { setLoading(false) }
  }

  const handleHangup = async () => {
    if (!activeCall?.callSid) return
    await dialerAPI.hangupCall(activeCall.callSid as string)
    setActiveCall(null); setElapsed(0)
    setMessage('📵 Call ended')
  }

  const filtered = contacts.filter(c =>
    !search ||
    (c.name as string)?.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone as string)?.includes(search)
  )

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '320px 1fr',
      gap: 20, padding: 32,
      minHeight: '100vh',
      maxWidth: 1600, margin: '0 auto',
    }}>

      {/* ============== LEFT — Control Panel ============== */}
      <motion.aside
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass"
        style={{
          padding: 22,
          display: 'flex', flexDirection: 'column', gap: 18,
          height: 'fit-content',
          position: 'sticky', top: 24,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: 'var(--grad-brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--glow-brand)',
          }}>
            <Phone size={18} color="#fff"/>
          </div>
          <div>
            <div className="display" style={{
              fontSize: 16, fontWeight: 700, color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
            }}>
              Dialer Control
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Operator console
            </div>
          </div>
        </div>

        {/* Agent Status */}
        <div>
          <div style={{
            fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 8,
          }}>
            Agent Status
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setAgentStatus(s => s === 'READY' ? 'OFFLINE' : 'READY')}
            style={{
              width: '100%', padding: '12px 14px',
              background: agentStatus === 'READY' ? 'var(--success-bg)' : 'var(--bg-glass)',
              border: `1px solid ${agentStatus === 'READY' ? 'var(--success)' : 'var(--border-input)'}`,
              borderRadius: 'var(--radius-md)',
              color: agentStatus === 'READY' ? 'var(--success)' : 'var(--text-muted)',
              fontWeight: 700, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: agentStatus === 'READY' ? '0 0 20px var(--success-glow)' : 'none',
              transition: 'all 0.25s',
              letterSpacing: 0.4,
            }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: agentStatus === 'READY' ? 'var(--success)' : 'var(--text-faint)',
              boxShadow: agentStatus === 'READY' ? '0 0 10px var(--success-glow)' : 'none',
            }} className={agentStatus === 'READY' ? 'pulse-dot' : ''}/>
            {agentStatus === 'READY' ? 'READY' : 'OFFLINE'}
          </motion.button>
        </div>

        {/* Campaign select */}
        <div>
          <div style={{
            fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 8,
          }}>
            Campaign
          </div>
          <select
            value={selectedCamp ?? ''}
            onChange={e => setSelectedCamp(Number(e.target.value))}
            style={{
              width: '100%', padding: '12px 14px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-input)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: 13, outline: 'none',
              backdropFilter: 'blur(8px)',
            }}
          >
            <option value="">— Select a campaign —</option>
            {campaigns.map(c => (
              <option key={c.id as number} value={c.id as number}>
                {c.name as string}
              </option>
            ))}
          </select>
        </div>

        {/* Active call card */}
        <AnimatePresence>
          {activeCall && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              style={{
                position: 'relative',
                background: 'linear-gradient(135deg, var(--success-bg), transparent)',
                border: '1px solid var(--success)',
                borderRadius: 'var(--radius-lg)',
                padding: 18,
                boxShadow: '0 0 30px var(--success-glow)',
                overflow: 'hidden',
              }}
            >
              {/* Pulse ring behind avatar */}
              <div style={{
                position: 'absolute', top: -40, right: -40,
                width: 140, height: 140, borderRadius: '50%',
                background: 'radial-gradient(circle, var(--success-glow) 0%, transparent 60%)',
                pointerEvents: 'none',
              }}/>

              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 10, fontWeight: 700, color: 'var(--success)',
                letterSpacing: 1.4, marginBottom: 10,
                textTransform: 'uppercase',
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--success)',
                  boxShadow: '0 0 10px var(--success-glow)',
                }} className="pulse-dot"/>
                Live Call
              </div>

              <div style={{
                fontSize: 16, fontWeight: 700, color: 'var(--text-primary)',
                marginBottom: 2,
              }}>
                {activeCall.name as string || 'Unknown'}
              </div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                {activeCall.phone as string}
              </div>

              <div className="display mono" style={{
                fontSize: 28, fontWeight: 700,
                color: 'var(--success)',
                textAlign: 'center', marginBottom: 14,
                fontVariantNumeric: 'tabular-nums',
                textShadow: '0 0 20px var(--success-glow)',
              }}>
                {fmt(elapsed)}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setMuted(p => !p)} style={{
                  flex: 1, padding: '10px',
                  background: muted ? 'var(--danger-bg)' : 'var(--bg-glass-hi)',
                  border: `1px solid ${muted ? 'var(--danger)' : 'var(--success)'}`,
                  borderRadius: 'var(--radius-md)',
                  color: muted ? 'var(--danger)' : 'var(--success)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontSize: 12.5, fontWeight: 600,
                }}>
                  {muted ? <MicOff size={14}/> : <Mic size={14}/>}
                  {muted ? 'Unmute' : 'Mute'}
                </button>
                <button onClick={handleHangup} style={{
                  flex: 1, padding: '10px',
                  background: 'var(--grad-danger)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontSize: 12.5, fontWeight: 700,
                  boxShadow: 'var(--glow-danger)',
                }}>
                  <PhoneOff size={14}/> Hang Up
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start / Stop */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={isDialing ? handleStopCampaign : handleStartCampaign}
          disabled={loading || agentStatus === 'OFFLINE'}
          style={{
            width: '100%', padding: '13px',
            background: isDialing ? 'var(--grad-danger)' : 'var(--grad-brand)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            color: '#fff', fontWeight: 700, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: (loading || agentStatus === 'OFFLINE') ? 0.5 : 1,
            cursor: (loading || agentStatus === 'OFFLINE') ? 'not-allowed' : 'pointer',
            boxShadow: isDialing ? 'var(--glow-danger)' : 'var(--glow-brand)',
            letterSpacing: 0.3,
          }}
        >
          {isDialing
            ? <><Square size={14} fill="#fff"/> Stop Campaign</>
            : <><Play size={14} fill="#fff"/> Start Campaign</>}
        </motion.button>

        {agentStatus === 'OFFLINE' && !isDialing && (
          <div style={{
            fontSize: 11.5, color: 'var(--warning)',
            textAlign: 'center',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px',
            background: 'var(--warning-bg)',
            border: '1px solid var(--warning)',
            borderRadius: 'var(--radius-sm)',
          }}>
            <Power size={12}/> Set status to <b>Ready</b> to begin
          </div>
        )}

        {message && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            key={message}
            style={{
              fontSize: 12, color: 'var(--text-secondary)',
              textAlign: 'center', padding: '10px 12px',
              background: 'var(--bg-glass)',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            {message}
          </motion.div>
        )}
      </motion.aside>

      {/* ============== RIGHT — Contacts Table ============== */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass"
        style={{ padding: 24, overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16, marginBottom: 18, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 className="display" style={{
              fontSize: 18, fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
            }}>
              Pending Contacts
            </h2>
            <span className="badge" style={{
              background: 'var(--accent-bg)',
              color: 'var(--accent-text)',
              border: '1px solid var(--border-strong)',
            }}>
              <Sparkles size={10}/> {filtered.length}
            </span>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', minWidth: 260 }}>
            <Search size={14} color="var(--text-muted)" style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            }}/>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name or phone…"
              style={{
                width: '100%', padding: '9px 12px 9px 34px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-input)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)', fontSize: 13, outline: 'none',
                backdropFilter: 'blur(8px)',
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ overflow: 'auto', borderRadius: 'var(--radius-md)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-glass)' }}>
                {['#','Contact','Phone','Status','Action'].map(h => (
                  <th key={h} style={{
                    padding: '12px 14px', textAlign: 'left',
                    fontSize: 10.5, fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: 1,
                    borderBottom: '1px solid var(--border)',
                    backdropFilter: 'blur(8px)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{
                    textAlign: 'center', padding: 50,
                    color: 'var(--text-muted)', fontSize: 13,
                  }}>
                    {selectedCamp
                      ? 'No pending contacts in this campaign'
                      : 'Select a campaign to view contacts'}
                  </td>
                </tr>
              ) : filtered.map((c, i) => (
                <motion.tr
                  key={c.id as number}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="table-row"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <td className="mono" style={{
                    padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)',
                  }}>
                    {String(i+1).padStart(2,'0')}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: 'var(--grad-brand)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: '#fff',
                        boxShadow: '0 0 12px var(--accent-glow)',
                      }}>
                        {(c.name as string)?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span style={{ fontSize: 13.5, color: 'var(--text-primary)', fontWeight: 600 }}>
                        {c.name as string}
                      </span>
                    </div>
                  </td>
                  <td className="mono" style={{
                    padding: '12px 14px', fontSize: 13, color: 'var(--text-secondary)',
                  }}>
                    {c.phone as string}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span className="badge" style={{
                      color: 'var(--warning)',
                      background: 'var(--warning-bg)',
                      border: '1px solid var(--warning)',
                    }}>
                      {c.status as string}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleManualCall(c)}
                      disabled={!!activeCall || loading}
                      style={{
                        background: !!activeCall || loading ? 'var(--bg-glass)' : 'var(--accent-bg)',
                        border: `1px solid ${!!activeCall || loading ? 'var(--border-input)' : 'var(--accent)'}`,
                        borderRadius: 'var(--radius-sm)',
                        padding: '6px 12px',
                        cursor: activeCall ? 'not-allowed' : 'pointer',
                        color: !!activeCall || loading ? 'var(--text-muted)' : 'var(--accent-text)',
                        display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5,
                        fontWeight: 600,
                        opacity: (!!activeCall || loading) ? 0.5 : 1,
                      }}
                    >
                      <Phone size={11}/> Call
                    </motion.button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.section>
    </div>
  )
}
