import { motion } from 'framer-motion'
import { Activity, Clock, MicOff, PauseCircle, PhoneCall } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useSipStore } from '../store/sip.store'

function fmt(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export default function DialerActivityBeacon() {
  const location = useLocation()
  const navigate = useNavigate()
  const activeCall = useSipStore(s => s.activeCall)
  const onHold = useSipStore(s => s.onHold)
  const muted = useSipStore(s => s.muted)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!activeCall) {
      setElapsed(0)
      return
    }

    const tick = () => {
      const startedAt = activeCall.startedAt || Date.now()
      setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)))
    }

    tick()
    const interval = window.setInterval(tick, 1000)
    return () => window.clearInterval(interval)
  }, [activeCall])

  const status = useMemo(() => {
    if (onHold) return 'Call on hold'
    if (muted) return 'Call active · muted'
    return 'Call in progress'
  }, [muted, onHold])

  if (!activeCall || location.pathname === '/dialer') return null

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 18, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      onClick={() => navigate('/dialer')}
      style={{
        position: 'fixed',
        right: 26,
        bottom: 30,
        zIndex: 10020,
        minWidth: 250,
        maxWidth: 'min(360px, calc(100vw - 34px))',
        border: '1px solid rgba(255,59,95,0.46)',
        borderRadius: 24,
        padding: '12px 14px',
        color: '#f9f7ff',
        background: `
          radial-gradient(circle at 10% 0%,rgba(251,11,140,0.34),transparent 42%),
          linear-gradient(145deg,rgba(42,8,22,0.96),rgba(12,8,22,0.95))
        `,
        boxShadow: '0 20px 54px rgba(0,0,0,0.44),0 0 36px rgba(251,11,140,0.22)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        cursor: 'pointer',
        display: 'grid',
        gridTemplateColumns: '38px minmax(0,1fr) auto',
        gap: 11,
        alignItems: 'center',
        textAlign: 'left',
      }}
      aria-label="Open dialer activity"
    >
      <span
        style={{
          width: 38,
          height: 38,
          borderRadius: 16,
          display: 'grid',
          placeItems: 'center',
          color: '#00f5a0',
          background: 'rgba(0,245,160,0.12)',
          border: '1px solid rgba(0,245,160,0.28)',
          boxShadow: '0 0 22px rgba(0,245,160,0.20)',
          position: 'relative',
        }}
      >
        <PhoneCall size={18} />
        <span
          style={{
            position: 'absolute',
            right: -1,
            top: -1,
            width: 10,
            height: 10,
            borderRadius: 999,
            background: '#ff3b5f',
            boxShadow: '0 0 0 4px rgba(255,59,95,0.16),0 0 18px rgba(255,59,95,0.72)',
          }}
        />
      </span>

      <span style={{ minWidth: 0 }}>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 10,
            fontWeight: 950,
            color: '#ff9caf',
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          <Activity size={12} /> Dialer busy
        </span>
        <span
          style={{
            display: 'block',
            marginTop: 4,
            fontSize: 13,
            fontWeight: 900,
            color: '#fff',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {status}
        </span>
        <span
          style={{
            display: 'block',
            marginTop: 2,
            fontSize: 11,
            color: 'rgba(249,247,255,0.62)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {activeCall.remoteIdentity || 'SIP call'}
        </span>
      </span>

      <span
        style={{
          display: 'grid',
          gap: 6,
          justifyItems: 'end',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            color: '#00f5a0',
            fontSize: 12,
            fontWeight: 950,
            fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
          }}
        >
          <Clock size={13} /> {fmt(elapsed)}
        </span>
        <span style={{ display: 'flex', gap: 5 }}>
          {onHold && <PauseCircle size={14} color="#22d3ee" />}
          {muted && <MicOff size={14} color="#ff9caf" />}
        </span>
      </span>
    </motion.button>
  )
}
