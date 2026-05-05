import { useState } from 'react'
import { motion } from 'framer-motion'
import { PhoneOff, Mic, MicOff, Volume2, UserPlus } from 'lucide-react'

interface Props {
  contact: {
    name: string
    phone: string
    callSid?: string
  }
  elapsed:  number
  onHangup: () => void
}

export default function CallStatusBar({ contact, elapsed, onHangup }: Props) {
  const [muted, setMuted] = useState(false)

  const fmt = (s: number) =>
    `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -50, opacity: 0 }}
      style={{
        position: 'fixed',
        top: 0, left: 'var(--sidebar-width)', right: 0, zIndex: 50,
        background: 'linear-gradient(90deg, rgba(4, 120, 87, 0.85), rgba(16, 217, 122, 0.65))',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid var(--success)',
        padding: '12px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 8px 32px rgba(16, 217, 122, 0.25)',
      }}
    >
      {/* === Left — Contact info === */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          position: 'relative',
          width: 42, height: 42, borderRadius: '50%',
          background: 'rgba(255,255,255,0.18)',
          border: '2px solid rgba(255,255,255,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 16, color: '#fff',
          backdropFilter: 'blur(8px)',
        }}>
          {contact.name?.charAt(0)?.toUpperCase() || '?'}
          {/* pulse rings */}
          <span style={{
            position: 'absolute', inset: -2, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.6)',
            animation: 'pulse-ring 2s ease-out infinite',
          }}/>
        </div>

        <div>
          <div style={{
            fontFamily: 'Space Grotesk, Inter, sans-serif',
            fontWeight: 700, fontSize: 15, color: '#fff',
            letterSpacing: '-0.01em',
          }}>
            {contact.name}
          </div>
          <div style={{
            fontSize: 12, color: 'rgba(255,255,255,0.85)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span className="mono">{contact.phone}</span>
            <span>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 0 8px #fff',
              }} className="pulse-dot"/>
              Connected
            </span>
          </div>
        </div>

        {/* Timer */}
        <div className="mono" style={{
          fontSize: 22, fontWeight: 700, color: '#fff',
          fontVariantNumeric: 'tabular-nums',
          marginLeft: 14, letterSpacing: 1,
          textShadow: '0 0 16px rgba(255,255,255,0.4)',
        }}>
          {fmt(elapsed)}
        </div>
      </div>

      {/* === Right — Controls === */}
      <div style={{ display: 'flex', gap: 10 }}>
        <ControlButton
          onClick={() => setMuted(p => !p)}
          active={muted}
          icon={muted ? <MicOff size={14}/> : <Mic size={14}/>}
          label={muted ? 'Unmute' : 'Mute'}
        />
        <ControlButton icon={<Volume2 size={14}/>} label="Speaker"/>
        <ControlButton icon={<UserPlus size={14}/>} label="Transfer"/>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onHangup}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--grad-danger)',
            border: 'none',
            borderRadius: 10, padding: '8px 18px',
            color: '#fff', fontWeight: 700, fontSize: 13,
            boxShadow: '0 6px 20px rgba(255, 84, 112, 0.4)',
            letterSpacing: 0.2,
          }}
        >
          <PhoneOff size={14}/> Hang Up
        </motion.button>
      </div>
    </motion.div>
  )
}

function ControlButton({
  icon, label, onClick, active = false,
}: {
  icon: React.ReactNode; label: string; onClick?: () => void; active?: boolean
}) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: active ? 'rgba(255, 84, 112, 0.85)' : 'rgba(255,255,255,0.15)',
        border: `1px solid ${active ? '#ff5470' : 'rgba(255,255,255,0.3)'}`,
        borderRadius: 10, padding: '8px 14px',
        color: '#fff', fontSize: 13, fontWeight: 600,
        backdropFilter: 'blur(8px)',
      }}
    >
      {icon}
      {label}
    </motion.button>
  )
}
