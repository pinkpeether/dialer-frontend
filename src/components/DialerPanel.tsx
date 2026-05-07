import { motion, AnimatePresence } from 'framer-motion'
import {
  PhoneOff, Play, Square, BarChart2, Clock, CheckCircle, XCircle, Power,
} from 'lucide-react'

interface Props {
  stats: { total: number; pending: number; answered: number; missed: number }
  isDialing:  boolean
  agentReady: boolean
  activeCall: Record<string,unknown> | null
  elapsed:    number
  onStart:    () => void
  onStop:     () => void
  onHangup:   () => void
}

export default function DialerPanel({
  stats, isDialing, agentReady,
  activeCall, elapsed, onStart, onStop, onHangup,
}: Props) {
  const fmt = (s: number) =>
    `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  const tiles = [
    { label:'Total',    value:stats.total,    icon: BarChart2,   color:'#fb0b8c' },
    { label:'Pending',  value:stats.pending,  icon: Clock,       color:'#f0b90b' },
    { label:'Answered', value:stats.answered, icon: CheckCircle, color:'#00a747' },
    { label:'Missed',   value:stats.missed,   icon: XCircle,     color:'#8057d7' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Stats grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
      }}>
        {tiles.map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass"
              style={{
                position: 'relative',
                padding: 14,
                borderRadius: 14,
                overflow: 'hidden',
              }}
            >
              <div style={{
                position: 'absolute', top: -20, right: -20,
                width: 90, height: 90, borderRadius: '50%',
                background: `radial-gradient(circle, ${s.color}28 0%, transparent 70%)`,
                pointerEvents: 'none',
              }}/>
              <div style={{
                color: s.color, marginBottom: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <Icon size={14}/>
              </div>
              <div className="mono" style={{
                fontSize: 22, fontWeight: 700,
                color: 'var(--text)',
                letterSpacing: '-0.03em',
              }}>
                {s.value}
              </div>
              <div className="mono" style={{
                fontSize: 10, color: 'var(--text-3)',
                fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: 0.8, marginTop: 2,
              }}>
                {s.label}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Active call */}
      <AnimatePresence>
        {activeCall && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{
              position: 'relative',
              background: 'linear-gradient(135deg, rgba(0,167,71,0.10), transparent)',
              border: '1px solid rgba(0,167,71,0.32)',
              borderRadius: 16,
              padding: 18, textAlign: 'center',
              overflow: 'hidden',
              boxShadow: '0 12px 30px rgba(0,167,71,0.18)',
            }}
          >
            <div style={{
              position: 'absolute', top: -40, right: -40,
              width: 160, height: 160, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(42,233,123,0.30) 0%, transparent 60%)',
              pointerEvents: 'none',
            }}/>
            <div className="mono" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 10, fontWeight: 700, color: 'var(--green-2)',
              letterSpacing: 1.4, marginBottom: 8, textTransform: 'uppercase',
            }}>
              <span className="pulse-dot"/>
              Live Call
            </div>

            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
              {activeCall.name as string}
            </div>
            <div className="mono" style={{
              fontSize: 12, color: 'var(--text-3)', marginBottom: 12,
            }}>
              {activeCall.phone as string}
            </div>

            <div className="mono" style={{
              fontSize: 28, fontWeight: 700,
              color: 'var(--green-2)',
              marginBottom: 14,
              letterSpacing: '-0.03em',
              textShadow: '0 0 24px rgba(42,233,123,0.30)',
            }}>
              {fmt(elapsed)}
            </div>

            <button onClick={onHangup} style={{
              width: '100%', padding: '11px',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              border: 'none',
              borderRadius: 12,
              color: '#fff', fontWeight: 700, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: '0 8px 24px rgba(239,68,68,0.35)',
              cursor: 'pointer',
            }}>
              <PhoneOff size={14}/> Hang Up
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {isDialing && !activeCall && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            padding: '12px',
            borderRadius: 12,
            background: 'rgba(251,11,140,0.10)',
            border: '1px solid rgba(251,11,140,0.32)',
            fontSize: 12.5, color: 'var(--pink)',
            textAlign: 'center', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 8px 24px rgba(251,11,140,0.18)',
          }}
        >
          <span className="pulse-dot pink"/>
          Dialing next number…
        </motion.div>
      )}

      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={isDialing ? onStop : onStart}
        disabled={!agentReady && !isDialing}
        style={{
          width: '100%', padding: '13px',
          background: isDialing
            ? 'linear-gradient(135deg, #ef4444, #dc2626)'
            : 'linear-gradient(135deg, #fb0b8c, #ff4bad)',
          border: 'none',
          borderRadius: 12,
          color: '#fff', fontWeight: 800, fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: (!agentReady && !isDialing) ? 0.45 : 1,
          cursor: (!agentReady && !isDialing) ? 'not-allowed' : 'pointer',
          boxShadow: isDialing
            ? '0 12px 28px rgba(239,68,68,0.32)'
            : '0 12px 28px rgba(251,11,140,0.32)',
          letterSpacing: 0.3,
        }}
      >
        {isDialing
          ? <><Square size={14} fill="#fff"/> Stop Dialing</>
          : <><Play size={14} fill="#fff"/> Start Dialing</>}
      </motion.button>

      {!agentReady && !isDialing && (
        <div className="mono" style={{
          fontSize: 11.5, color: 'var(--status-pending-fg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '9px',
          background: 'var(--status-pending-bg)',
          border: '1px solid var(--status-pending-bd)',
          borderRadius: 10,
          fontWeight: 700,
        }}>
          <Power size={12}/> Set status to <b>Ready</b> to begin
        </div>
      )}
    </div>
  )
}