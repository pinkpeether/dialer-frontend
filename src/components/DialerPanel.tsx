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
    { label:'Total',    value:stats.total,    icon: BarChart2,   color:'var(--accent)'  },
    { label:'Pending',  value:stats.pending,  icon: Clock,       color:'var(--warning)' },
    { label:'Answered', value:stats.answered, icon: CheckCircle, color:'var(--success)' },
    { label:'Missed',   value:stats.missed,   icon: XCircle,     color:'var(--danger)'  },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

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
                overflow: 'hidden',
              }}
            >
              <div style={{
                position: 'absolute', top: -20, right: -20,
                width: 80, height: 80, borderRadius: '50%',
                background: `radial-gradient(circle, ${s.color}22 0%, transparent 70%)`,
                pointerEvents: 'none',
              }}/>
              <div style={{
                color: s.color, marginBottom: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <Icon size={14}/>
              </div>
              <div className="display" style={{
                fontSize: 22, fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {s.value}
              </div>
              <div style={{
                fontSize: 10.5, color: 'var(--text-muted)',
                fontWeight: 600, textTransform: 'uppercase',
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
              background: 'linear-gradient(135deg, var(--success-bg), transparent)',
              border: '1px solid var(--success)',
              borderRadius: 'var(--radius-lg)',
              padding: 18, textAlign: 'center',
              overflow: 'hidden',
              boxShadow: '0 0 30px var(--success-glow)',
            }}
          >
            <div style={{
              position: 'absolute', top: -40, right: -40,
              width: 140, height: 140, borderRadius: '50%',
              background: 'radial-gradient(circle, var(--success-glow) 0%, transparent 60%)',
              pointerEvents: 'none',
            }}/>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 10, fontWeight: 700, color: 'var(--success)',
              letterSpacing: 1.4, marginBottom: 8, textTransform: 'uppercase',
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--success)',
                boxShadow: '0 0 10px var(--success-glow)',
              }} className="pulse-dot"/>
              Live Call
            </div>

            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              {activeCall.name as string}
            </div>
            <div className="mono" style={{
              fontSize: 12, color: 'var(--text-muted)', marginBottom: 12,
            }}>
              {activeCall.phone as string}
            </div>

            <div className="display mono" style={{
              fontSize: 28, fontWeight: 700,
              color: 'var(--success)',
              marginBottom: 14,
              fontVariantNumeric: 'tabular-nums',
              textShadow: '0 0 20px var(--success-glow)',
            }}>
              {fmt(elapsed)}
            </div>

            <button onClick={onHangup} style={{
              width: '100%', padding: '11px',
              background: 'var(--grad-danger)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: '#fff', fontWeight: 700, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: 'var(--glow-danger)',
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
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-bg)',
            border: '1px solid var(--accent)',
            fontSize: 12.5, color: 'var(--accent-text)',
            textAlign: 'center', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 0 20px var(--accent-glow)',
          }}
        >
          <span className="pulse-dot" style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: '0 0 10px var(--accent-glow)',
          }}/>
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
          background: isDialing ? 'var(--grad-danger)' : 'var(--grad-brand)',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          color: '#fff', fontWeight: 700, fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: (!agentReady && !isDialing) ? 0.4 : 1,
          cursor: (!agentReady && !isDialing) ? 'not-allowed' : 'pointer',
          boxShadow: isDialing ? 'var(--glow-danger)' : 'var(--glow-brand)',
          letterSpacing: 0.3,
        }}
      >
        {isDialing
          ? <><Square size={14} fill="#fff"/> Stop Dialing</>
          : <><Play size={14} fill="#fff"/> Start Dialing</>}
      </motion.button>

      {!agentReady && !isDialing && (
        <div style={{
          fontSize: 11.5, color: 'var(--warning)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '8px',
          background: 'var(--warning-bg)',
          border: '1px solid var(--warning)',
          borderRadius: 'var(--radius-sm)',
        }}>
          <Power size={12}/> Set status to <b>Ready</b> to begin
        </div>
      )}
    </div>
  )
}
