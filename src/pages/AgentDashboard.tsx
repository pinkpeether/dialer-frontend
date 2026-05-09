import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  User,
  Wifi,
  WifiOff,
} from 'lucide-react'
import api from '../api/axios'
import DispositionPanel from '../components/DispositionPanel'
import type { DispositionPayload } from '../components/DispositionPanel'
import { useAuthStore } from '../store/auth.store'

type AgentStatus = 'ONLINE' | 'READY' | 'BUSY' | 'WRAP_UP' | 'OFFLINE'

type SocketState = 'connecting' | 'connected' | 'disconnected' | 'error'

interface IncomingContact {
  id?: number
  name?: string | null
  phone?: string | null
  campaign?: { name?: string | null } | null
}

interface IncomingCallPayload {
  callId: number
  contactId?: number
  name?: string | null
  phone?: string | null
  campaignName?: string | null
  twilioCallSid?: string | null
  contact?: IncomingContact | null
}

interface EndedCallPayload {
  callId?: number
  disposition?: string
}

interface ActiveCall {
  callId: number
  contactId?: number
  name: string
  phone: string
  campaignName: string
  twilioCallSid?: string
}

interface AgentStats {
  callsHandled: number
  talkSeconds: number
  connected: number
}

const VALID_STATUSES: AgentStatus[] = ['ONLINE', 'READY', 'BUSY', 'WRAP_UP', 'OFFLINE']

const SOCKET_URL = (() => {
  const explicitSocketUrl = import.meta.env.VITE_SOCKET_URL as string | undefined
  if (explicitSocketUrl) return explicitSocketUrl

  const apiUrl = import.meta.env.VITE_API_URL as string | undefined
  if (apiUrl) return apiUrl.replace(/\/api\/?$/, '')

  return 'http://localhost:3000'
})()

const normalizeStatus = (value?: string): AgentStatus => {
  if (value && VALID_STATUSES.includes(value as AgentStatus)) return value as AgentStatus
  return 'OFFLINE'
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

const normalizeIncomingCall = (payload: IncomingCallPayload): ActiveCall => ({
  callId: payload.callId,
  contactId: payload.contactId ?? payload.contact?.id,
  name: payload.name ?? payload.contact?.name ?? 'Unknown Contact',
  phone: payload.phone ?? payload.contact?.phone ?? 'Unknown Number',
  campaignName: payload.campaignName ?? payload.contact?.campaign?.name ?? 'Live Campaign',
  twilioCallSid: payload.twilioCallSid ?? undefined,
})

const statusMeta: Record<AgentStatus, { label: string; tone: string; bg: string }> = {
  ONLINE:  { label: 'Online',  tone: 'var(--green-2)', bg: 'var(--status-ready-bg)' },
  READY:   { label: 'Ready',   tone: 'var(--green-2)', bg: 'var(--status-ready-bg)' },
  BUSY:    { label: 'Busy',    tone: 'var(--pink)',    bg: 'var(--status-busy-bg)' },
  WRAP_UP: { label: 'Wrap Up', tone: 'var(--purple)',  bg: 'rgba(128,87,215,0.12)' },
  OFFLINE: { label: 'Offline', tone: 'var(--text-3)',  bg: 'var(--surface-2)' },
}

export default function AgentDashboard() {
  const user = useAuthStore(state => state.user)
  const token = useAuthStore(state => state.token)
  const socketRef = useRef<Socket | null>(null)
  const [socketState, setSocketState] = useState<SocketState>('connecting')
  const [status, setStatus] = useState<AgentStatus>(() => normalizeStatus(user?.status))
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null)
  const [talkTime, setTalkTime] = useState(0)
  const [muted, setMuted] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<AgentStats>({
    callsHandled: 0,
    talkSeconds: 0,
    connected: 0,
  })

  const socketToken = token ?? localStorage.getItem('jd_token') ?? ''

  const activeStatus = useMemo(() => statusMeta[status], [status])

  const clearCall = useCallback(() => {
    setActiveCall(null)
    setTalkTime(0)
    setMuted(false)
  }, [])

  useEffect(() => {
    if (!socketToken) {
      setSocketState('error')
      setError('Socket token missing. Please login again.')
      return undefined
    }

    const socket = io(SOCKET_URL, {
      auth: { token: socketToken },
      transports: ['websocket', 'polling'],
    })

    socketRef.current = socket
    setSocketState('connecting')

    const handleConnect = () => {
      setSocketState('connected')
      setError('')
    }

    const handleDisconnect = () => {
      setSocketState('disconnected')
    }

    const handleConnectError = () => {
      setSocketState('error')
      setError('Socket connection failed. Check backend socket server and JWT.')
    }

    const handleIncoming = (payload: IncomingCallPayload) => {
      setActiveCall(normalizeIncomingCall(payload))
      setStatus('BUSY')
      setTalkTime(0)
      setMuted(false)
    }

    const handleEnded = (payload: EndedCallPayload) => {
      if (payload.callId && activeCall?.callId && payload.callId !== activeCall.callId) return

      setStats(current => ({
        callsHandled: current.callsHandled + 1,
        talkSeconds: current.talkSeconds + talkTime,
        connected: payload.disposition === 'ANSWERED' ? current.connected + 1 : current.connected,
      }))
      clearCall()
      setStatus('READY')
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectError)
    socket.on('call:incoming', handleIncoming)
    socket.on('call:ended', handleEnded)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectError)
      socket.off('call:incoming', handleIncoming)
      socket.off('call:ended', handleEnded)
      socket.disconnect()
      socketRef.current = null
    }
  }, [activeCall?.callId, clearCall, socketToken, talkTime])

  useEffect(() => {
    if (!activeCall) return undefined

    const timer = window.setInterval(() => {
      setTalkTime(current => current + 1)
    }, 1000)

    return () => window.clearInterval(timer)
  }, [activeCall])

  const updateStatus = async (newStatus: AgentStatus) => {
    setStatus(newStatus)
    setError('')
    socketRef.current?.emit('agent:status', newStatus)

    try {
      await api.patch('/agents/me/status', { status: newStatus })
    } catch {
      setError('Status updated over socket, but REST /agents/me/status is not available yet.')
    }
  }

  const handleHangup = async () => {
    if (!activeCall) return

    socketRef.current?.emit('call:hangup', { callId: activeCall.callId })

    if (activeCall.twilioCallSid) {
      try {
        await api.post('/dialer/call/hangup', { twilioCallSid: activeCall.twilioCallSid })
      } catch {
        setError('Hangup signal sent over socket, but REST hangup failed.')
      }
    }

    clearCall()
    setStatus('WRAP_UP')
  }

  const handleDispositionSubmit = async (payload: DispositionPayload) => {
    socketRef.current?.emit('call:disposition', payload)

    try {
      await api.post(`/calls/${payload.callId}/disposition`, {
        disposition: payload.disposition,
        notes: payload.notes,
      })
    } catch {
      socketRef.current?.emit('call:ended', payload)
    }

    setStats(current => ({
      callsHandled: current.callsHandled + 1,
      talkSeconds: current.talkSeconds + talkTime,
      connected: payload.disposition === 'ANSWERED' ? current.connected + 1 : current.connected,
    }))
    clearCall()
    setStatus('READY')
  }

  const toggleMute = () => {
    const nextMuted = !muted
    setMuted(nextMuted)
    socketRef.current?.emit('call:mute', {
      callId: activeCall?.callId,
      muted: nextMuted,
    })
  }

  return (
    <div style={{ padding: 24, color: 'var(--text)' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        marginBottom: 22,
      }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            <Activity size={12} /> Agent Experience
          </div>
          <h1 style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(28px, 4vw, 44px)',
            fontWeight: 900,
            letterSpacing: '-0.04em',
          }}>
            Agent Dashboard
          </h1>
          <p style={{ margin: '8px 0 0', color: 'var(--text-3)', maxWidth: 720 }}>
            Live call handling, status control, disposition capture, and real-time socket updates.
          </p>
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          borderRadius: 999,
          background: socketState === 'connected' ? 'var(--status-ready-bg)' : 'var(--status-busy-bg)',
          border: '1px solid var(--border)',
          color: socketState === 'connected' ? 'var(--green-2)' : 'var(--pink)',
          fontWeight: 800,
        }}>
          {socketState === 'connected' ? <Wifi size={16} /> : <WifiOff size={16} />}
          Socket {socketState}
        </div>
      </div>

      {error && (
        <div style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          padding: '12px 14px',
          borderRadius: 14,
          background: 'var(--status-busy-bg)',
          border: '1px solid var(--status-busy-bd)',
          color: 'var(--status-busy-fg)',
          marginBottom: 18,
          fontWeight: 700,
        }}>
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 1.4fr)',
        gap: 18,
        alignItems: 'start',
      }}>
        <section className="glass-hi" style={{ padding: 20, borderRadius: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center' }}>
            <div>
              <div style={{ color: 'var(--text-3)', fontSize: 12, fontWeight: 800 }}>Signed in as</div>
              <div style={{ marginTop: 4, color: 'var(--text)', fontSize: 18, fontWeight: 900 }}>
                {user?.name ?? 'Agent'}
              </div>
              <div className="mono" style={{ marginTop: 4, color: 'var(--text-3)', fontSize: 11 }}>
                {user?.email ?? 'No email loaded'}
              </div>
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: activeStatus.bg,
              color: activeStatus.tone,
              border: '1px solid var(--border)',
              padding: '9px 12px',
              borderRadius: 999,
              fontWeight: 900,
            }}>
              <CheckCircle2 size={15} />
              {activeStatus.label}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
            {(['READY', 'WRAP_UP', 'OFFLINE'] as AgentStatus[]).map(nextStatus => (
              <button
                key={nextStatus}
                type="button"
                disabled={status === nextStatus}
                onClick={() => { void updateStatus(nextStatus) }}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: status === nextStatus ? '1px solid var(--pink)' : '1px solid var(--border)',
                  background: status === nextStatus ? 'rgba(251,11,140,0.12)' : 'var(--surface)',
                  color: status === nextStatus ? 'var(--pink)' : 'var(--text-2)',
                  cursor: status === nextStatus ? 'default' : 'pointer',
                  fontWeight: 900,
                }}
              >
                Set {statusMeta[nextStatus].label}
              </button>
            ))}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            marginTop: 18,
          }}>
            <StatCard label="Calls" value={String(stats.callsHandled)} />
            <StatCard label="Talk Time" value={formatDuration(stats.talkSeconds)} />
            <StatCard label="Connected" value={String(stats.connected)} />
          </div>
        </section>

        <section className="glass-hi" style={{ padding: 20, borderRadius: 22, minHeight: 420 }}>
          {activeCall ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
                marginBottom: 18,
              }}>
                <div>
                  <div className="eyebrow" style={{ marginBottom: 10 }}>
                    <Phone size={12} /> Live Call
                  </div>
                  <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 900 }}>
                    {activeCall.name}
                  </h2>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10, color: 'var(--text-3)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Phone size={14} /> {activeCall.phone}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <User size={14} /> {activeCall.campaignName}
                    </span>
                  </div>
                </div>

                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  height: 46,
                  padding: '0 16px',
                  borderRadius: 999,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--green-2)',
                  fontWeight: 900,
                  fontSize: 18,
                }}>
                  <Clock size={17} />
                  {formatDuration(talkTime)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
                <button
                  type="button"
                  onClick={toggleMute}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '11px 14px',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    background: muted ? 'rgba(128,87,215,0.14)' : 'var(--surface)',
                    color: muted ? 'var(--purple)' : 'var(--text-2)',
                    fontWeight: 900,
                  }}
                >
                  {muted ? <MicOff size={16} /> : <Mic size={16} />}
                  {muted ? 'Unmute' : 'Mute'}
                </button>

                <button
                  type="button"
                  onClick={() => { void handleHangup() }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '11px 14px',
                    borderRadius: 12,
                    border: '1px solid var(--status-busy-bd)',
                    background: 'var(--status-busy-bg)',
                    color: 'var(--status-busy-fg)',
                    fontWeight: 900,
                  }}
                >
                  <PhoneOff size={16} />
                  Hang Up
                </button>
              </div>

              <DispositionPanel callId={activeCall.callId} onSubmit={handleDispositionSubmit} />
            </motion.div>
          ) : (
            <div style={{
              minHeight: 360,
              display: 'grid',
              placeItems: 'center',
              textAlign: 'center',
              color: 'var(--text-3)',
            }}>
              <div>
                <div style={{
                  width: 76,
                  height: 76,
                  margin: '0 auto 16px',
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(251,11,140,0.14), rgba(42,233,123,0.12))',
                  border: '1px solid var(--border)',
                }}>
                  <Phone size={30} color="var(--pink)" />
                </div>
                <h2 style={{ margin: 0, color: 'var(--text)', fontFamily: 'var(--font-display)', fontWeight: 900 }}>
                  Waiting for incoming call
                </h2>
                <p style={{ maxWidth: 430, margin: '10px auto 0', lineHeight: 1.6 }}>
                  Set your status to Ready, then incoming socket events will appear here in real time.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: 12,
      textAlign: 'center',
    }}>
      <div className="mono" style={{ color: 'var(--text-3)', fontSize: 10, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ color: 'var(--text)', fontWeight: 900, fontSize: 18 }}>
        {value}
      </div>
    </div>
  )
}
