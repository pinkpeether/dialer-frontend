import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { io, type Socket } from 'socket.io-client'
import {
  Clock, Headphones, Mic, MicOff, Phone, PhoneCall, PhoneOff,
  Radio, ShieldCheck, UserRound, Wifi,
} from 'lucide-react'
import DispositionPanel, { type DispositionSubmitPayload } from '../components/DispositionPanel'
import { callsAPI } from '../api/calls.api'
import { useAuthStore } from '../store/auth.store'

type AgentStatus = 'OFFLINE' | 'READY' | 'BUSY' | 'WRAP_UP'

type SocketIncomingPayload = {
  callId?: number
  contactId?: number
  name?: string
  phone?: string
  campaignName?: string
  contact?: {
    id?: number
    name?: string | null
    phone?: string | null
    campaign?: { name?: string | null } | null
  } | null
}

type ActiveCall = {
  callId: number
  contactId?: number
  name: string
  phone: string
  campaignName: string
  startedAt: number
}

const statusTheme: Record<AgentStatus, { label: string; color: string; bg: string }> = {
  OFFLINE: { label: 'Offline', color: 'var(--text-3)', bg: 'var(--bg-glass)' },
  READY:   { label: 'Ready',   color: 'var(--green-2)', bg: 'rgba(0,167,71,0.10)' },
  BUSY:    { label: 'Busy',    color: 'var(--pink)',    bg: 'rgba(251,11,140,0.10)' },
  WRAP_UP: { label: 'Wrap Up', color: 'var(--warning)', bg: 'rgba(240,185,11,0.12)' },
}

const formatTimer = (seconds: number) => {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

const getSocketUrl = () => {
  const explicit = import.meta.env.VITE_SOCKET_URL as string | undefined
  if (explicit) return explicit
  const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3000/api'
  return apiUrl.replace(/\/api\/?$/, '')
}

const normalizeIncomingCall = (payload: SocketIncomingPayload): ActiveCall | null => {
  const callId = Number(payload.callId)
  if (!Number.isFinite(callId)) return null

  return {
    callId,
    contactId: payload.contactId ?? payload.contact?.id,
    name: payload.name || payload.contact?.name || 'Unknown Contact',
    phone: payload.phone || payload.contact?.phone || '—',
    campaignName: payload.campaignName || payload.contact?.campaign?.name || 'Live Campaign',
    startedAt: Date.now(),
  }
}

export default function AgentDashboard() {
  const user = useAuthStore(state => state.user)
  const [status, setStatus] = useState<AgentStatus>('OFFLINE')
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [muted, setMuted] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)
  const [message, setMessage] = useState('')
  const [stats, setStats] = useState({ callsHandled: 0, talkSeconds: 0, connected: 0 })
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('jd_token')
    if (!token) return

    const socket = io(getSocketUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socketRef.current = socket

    const handleConnect = () => {
      setSocketConnected(true)
      setMessage('✓ Realtime agent channel connected')
    }

    const handleDisconnect = () => {
      setSocketConnected(false)
      setMessage('Realtime channel disconnected')
    }

    const handleIncoming = (payload: SocketIncomingPayload) => {
      const incoming = normalizeIncomingCall(payload)
      if (!incoming) return
      setActiveCall(incoming)
      setElapsed(0)
      setMuted(false)
      setStatus('BUSY')
      setMessage(`📞 Incoming call from ${incoming.phone}`)
    }

    const handleEnded = () => {
      setActiveCall(null)
      setMuted(false)
      setStatus('READY')
      setMessage('Call ended')
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('call:incoming', handleIncoming)
    socket.on('call:ended', handleEnded)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('call:incoming', handleIncoming)
      socket.off('call:ended', handleEnded)
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!activeCall) {
      setElapsed(0)
      return
    }

    const timer = window.setInterval(() => setElapsed(seconds => seconds + 1), 1000)
    return () => window.clearInterval(timer)
  }, [activeCall])

  const updateStatus = (newStatus: AgentStatus) => {
    setStatus(newStatus)
    socketRef.current?.emit('agent:status', newStatus)
    setMessage(`Status changed to ${statusTheme[newStatus].label}`)
  }

  const handleHangup = () => {
    if (!activeCall) return
    socketRef.current?.emit('call:hangup', { callId: activeCall.callId })
    setMessage('Hangup sent')
  }

  const handleDisposition = async (payload: DispositionSubmitPayload) => {
    if (!activeCall) return

    try {
      await callsAPI.updateDisposition(activeCall.callId, payload)
    } catch {
      socketRef.current?.emit('call:ended', {
        callId: activeCall.callId,
        disposition: payload.disposition,
        notes: payload.notes,
      })
    }

    setStats(current => ({
      callsHandled: current.callsHandled + 1,
      talkSeconds: current.talkSeconds + elapsed,
      connected: payload.disposition === 'ANSWERED' ? current.connected + 1 : current.connected,
    }))
    setActiveCall(null)
    setMuted(false)
    setStatus('READY')
    setMessage('✓ Disposition saved')
  }

  const connectionLabel = socketConnected ? 'Socket Online' : 'Socket Offline'
  const connectedRate = useMemo(() => {
    if (stats.callsHandled === 0) return 0
    return Math.round((stats.connected / stats.callsHandled) * 100)
  }, [stats.callsHandled, stats.connected])

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1600, margin: '0 auto' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 18,
          flexWrap: 'wrap',
          marginBottom: 32,
        }}
      >
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 14 }}>
            <Headphones size={11} /> PTDT-Dialer Agent Desk
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
            Agent <span className="gradient-brand-text">Dashboard</span>
          </h1>
          <p style={{
            fontSize: 14.5,
            color: 'var(--text-3)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}>
            <span className="pulse-dot pink" /> Live call handling, status control, and disposition workflow.
          </p>
        </div>

        <div className="glass" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={socketConnected ? 'pulse-dot' : 'pulse-dot pink'} />
          <div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 800, letterSpacing: 1.1 }}>
              REALTIME CHANNEL
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: socketConnected ? 'var(--green-2)' : 'var(--pink)' }}>
              {connectionLabel}
            </div>
          </div>
        </div>
      </motion.div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(300px, 360px) minmax(0, 1fr)',
        gap: 20,
        alignItems: 'start',
      }}>
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass"
          style={{ padding: 22, position: 'sticky', top: 24 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: 'var(--grad-brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-pink)',
              color: '#fff',
            }}>
              <UserRound size={19} />
            </div>
            <div>
              <div className="display" style={{ fontSize: 16, color: 'var(--text)', fontWeight: 800 }}>
                {user?.name || 'Agent'}
              </div>
              <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 3 }}>
                {user?.agentCode || 'AGENT'} · {user?.role || 'AGENT'}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div className="mono" style={{
              fontSize: 10,
              fontWeight: 800,
              color: 'var(--text-3)',
              textTransform: 'uppercase',
              letterSpacing: 1.4,
              marginBottom: 10,
            }}>
              Agent Status
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {(['READY', 'WRAP_UP', 'OFFLINE'] as AgentStatus[]).map(item => {
                const active = status === item
                const theme = statusTheme[item]
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => updateStatus(item)}
                    disabled={status === 'BUSY' && item !== 'OFFLINE'}
                    style={{
                      cursor: status === 'BUSY' && item !== 'OFFLINE' ? 'not-allowed' : 'pointer',
                      padding: '12px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: active ? `1px solid ${theme.color}` : '1px solid var(--border)',
                      background: active ? theme.bg : 'var(--bg-glass)',
                      color: active ? theme.color : 'var(--text-3)',
                      fontWeight: 800,
                    }}
                  >
                    {theme.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{
            padding: 16,
            borderRadius: 'var(--radius-lg)',
            border: `1px solid ${statusTheme[status].color}`,
            background: statusTheme[status].bg,
            marginBottom: 18,
          }}>
            <div className="mono" style={{ color: 'var(--text-3)', fontSize: 10, letterSpacing: 1.2, marginBottom: 6 }}>
              CURRENT STATE
            </div>
            <div style={{ color: statusTheme[status].color, fontSize: 22, fontWeight: 900 }}>
              {statusTheme[status].label}
            </div>
            <div style={{ color: 'var(--text-3)', fontSize: 12.5, marginTop: 4 }}>
              {status === 'READY' ? 'Waiting for next routed call.' : status === 'BUSY' ? 'Active call in progress.' : 'Agent is not accepting calls.'}
            </div>
          </div>

          {message && (
            <div className="glass" style={{ padding: 13, color: 'var(--text-3)', fontSize: 12.5, lineHeight: 1.45 }}>
              {message}
            </div>
          )}
        </motion.aside>

        <main style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
            <StatCard icon={<PhoneCall size={17} />} label="Calls Handled" value={stats.callsHandled} color="var(--pink)" bg="rgba(251,11,140,0.10)" />
            <StatCard icon={<Clock size={17} />} label="Talk Time" value={formatTimer(stats.talkSeconds)} color="var(--green-2)" bg="rgba(0,167,71,0.10)" />
            <StatCard icon={<ShieldCheck size={17} />} label="Connected Rate" value={`${connectedRate}%`} color="var(--purple)" bg="rgba(128,87,215,0.12)" />
            <StatCard icon={<Wifi size={17} />} label="Live Status" value={statusTheme[status].label} color={statusTheme[status].color} bg={statusTheme[status].bg} />
          </div>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass"
            style={{ padding: 24, minHeight: 360 }}
          >
            <AnimatePresence mode="wait">
              {activeCall ? (
                <motion.div
                  key="active-call"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 16,
                    flexWrap: 'wrap',
                    marginBottom: 20,
                  }}>
                    <div>
                      <div className="eyebrow pink" style={{ marginBottom: 10 }}>
                        <Radio size={11} /> Active Routed Call
                      </div>
                      <h2 className="display" style={{
                        fontSize: 'clamp(24px, 3vw, 36px)',
                        fontWeight: 900,
                        color: 'var(--text)',
                        letterSpacing: '-0.04em',
                        marginBottom: 8,
                      }}>
                        {activeCall.name}
                      </h2>
                      <div style={{ color: 'var(--text-3)', fontSize: 14 }}>
                        {activeCall.phone} · {activeCall.campaignName}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: 1.2, marginBottom: 6 }}>
                        LIVE TIMER
                      </div>
                      <div style={{ fontSize: 34, fontWeight: 900, color: 'var(--pink)', fontFamily: 'var(--font-mono)' }}>
                        {formatTimer(elapsed)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
                    <button
                      type="button"
                      onClick={() => setMuted(current => !current)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '11px 16px',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--border)',
                        background: muted ? 'rgba(240,185,11,0.12)' : 'var(--bg-glass)',
                        color: muted ? 'var(--warning)' : 'var(--text)',
                        fontWeight: 800,
                      }}
                    >
                      {muted ? <MicOff size={15} /> : <Mic size={15} />}
                      {muted ? 'Muted' : 'Mute'}
                    </button>
                    <button
                      type="button"
                      onClick={handleHangup}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '11px 16px',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid rgba(239,68,68,0.32)',
                        background: 'rgba(239,68,68,0.10)',
                        color: 'var(--danger)',
                        fontWeight: 800,
                      }}
                    >
                      <PhoneOff size={15} /> Hang Up
                    </button>
                  </div>

                  <DispositionPanel onSubmit={handleDisposition} />
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{
                    minHeight: 330,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    color: 'var(--text-3)',
                  }}
                >
                  <div style={{
                    width: 82,
                    height: 82,
                    borderRadius: 26,
                    background: 'linear-gradient(135deg, rgba(251,11,140,0.16), rgba(128,87,215,0.10))',
                    border: '1px solid rgba(251,11,140,0.20)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 18,
                    color: 'var(--pink)',
                    boxShadow: 'var(--shadow-pink)',
                  }}>
                    <Phone size={34} />
                  </div>
                  <h2 className="display" style={{ color: 'var(--text)', fontSize: 24, fontWeight: 900, marginBottom: 8 }}>
                    Waiting for next call
                  </h2>
                  <p style={{ maxWidth: 440, lineHeight: 1.7, fontSize: 14 }}>
                    Set your status to <strong style={{ color: 'var(--green-2)' }}>Ready</strong> to receive live routed calls from the PTDT-Dialer backend.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        </main>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
  bg,
}: {
  icon: ReactNode
  label: string
  value: string | number
  color: string
  bg: string
}) {
  return (
    <div className="glass lift" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 38,
          height: 38,
          borderRadius: 13,
          background: bg,
          border: `1px solid ${color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
        }}>
          {icon}
        </div>
        <div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: 1.1, fontWeight: 800 }}>
            {label}
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', marginTop: 4 }}>
            {value}
          </div>
        </div>
      </div>
    </div>
  )
}
