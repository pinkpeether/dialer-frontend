import { useEffect, useState } from 'react'
import { RefreshCw, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '../store/auth.store'
import { useSipStore } from '../store/sip.store'
import { useSocket } from '../hooks/useSocket'

const roleLabel = (role?: string) => {
  if (role === 'CUSTOMER_ADMIN') return 'Customer Admin'
  if (role === 'SUPERVISOR') return 'Supervisor'
  if (role === 'AGENT') return 'Agent'
  if (role === 'SUPER_ADMIN') return 'PTDT Super Admin'
  if (role === 'ADMIN') return 'PTDT Admin'
  return role || 'Account'
}

function Pill({ eyebrow, value, color, icon }: { eyebrow: string; value: string; color: string; icon?: React.ReactNode }) {
  return (
    <div className="glass" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, minHeight: 48 }}>
      {icon || <span className="pulse-dot" style={{ background: color }} />}
      <div>
        <div className="mono" style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 900, letterSpacing: 1.1 }}>{eyebrow}</div>
        <div style={{ fontSize: 12.5, fontWeight: 900, color }}>{value}</div>
      </div>
    </div>
  )
}

export default function OperationalStatusPills({ onRefresh }: { onRefresh?: () => void }) {
  const user = useAuthStore(state => state.user)
  const sipConfig = useSipStore(state => state.config)
  const sipStatus = useSipStore(state => state.status)
  const socket = useSocket()
  const [connected, setConnected] = useState(Boolean(socket.isConnected))

  useEffect(() => {
    setConnected(Boolean(socket.isConnected))
    const cleanupConnect = socket.on('connect', () => setConnected(true))
    const cleanupDisconnect = socket.on('disconnect', () => setConnected(false))
    const timer = window.setInterval(() => setConnected(Boolean(socket.isConnected)), 2000)
    return () => {
      cleanupConnect()
      cleanupDisconnect()
      window.clearInterval(timer)
    }
  }, [socket])

  const sipLabel = sipConfig.enabled
    ? sipStatus === 'registered'
      ? 'SIP Registered'
      : sipStatus === 'in_call'
        ? 'SIP In Call'
        : sipStatus === 'calling'
          ? 'SIP Calling'
          : 'SIP Offline'
    : 'SIP Disabled'

  const sipColor = sipStatus === 'registered' || sipStatus === 'in_call' || sipStatus === 'calling'
    ? 'var(--green-2)'
    : 'var(--text-3)'

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      <Pill
        eyebrow="SIGNED IN"
        value={roleLabel(user?.role)}
        color="var(--purple)"
        icon={<ShieldCheck size={16} color="var(--purple)" />}
      />
      <Pill eyebrow="SIP" value={sipLabel} color={sipColor} />
      <Pill eyebrow="REALTIME" value={connected ? 'Online' : 'Offline'} color={connected ? 'var(--green-2)' : 'var(--pink)'} />
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          title="Refresh"
          style={{
            height: 48,
            width: 48,
            borderRadius: 16,
            border: '1px solid var(--border)',
            background: 'var(--bg-glass)',
            color: 'var(--text-3)',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={17} />
        </button>
      )}
    </div>
  )
}
