import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface Props {
  label:  string
  value:  string | number
  sub?:   string
  icon:   ReactNode
  color:  string
  bg:     string
  index?: number
  onClick?: () => void
  title?: string
}

export default function StatsCard({
  label, value, sub, icon, color, bg, index = 0, onClick, title,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      whileHover={{ y: -4 }}
      className="glass lift"
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={title}
      onClick={onClick}
      onKeyDown={event => {
        if (!onClick) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
      style={{
        position: 'relative',
        padding: 22,
        borderRadius: 20,
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : undefined,
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 16, right: 16, height: 2,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        opacity: 0.85,
        borderRadius: 2,
      }}/>

      {/* Soft radial glow behind icon */}
      <div style={{
        position: 'absolute', top: -30, right: -30,
        width: 150, height: 150, borderRadius: '50%',
        background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
        pointerEvents: 'none',
      }}/>

      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: 14,
        position: 'relative',
      }}>
        <span className="mono" style={{
          fontSize: 10.5, color: 'var(--text-3)', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: 1.2,
        }}>
          {label}
        </span>
        <div style={{
          background: bg, color,
          padding: 9, borderRadius: 12,
          border: `1px solid ${color}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 6px 18px ${color}28`,
        }}>
          {icon}
        </div>
      </div>

      <div className="mono" style={{
        fontSize: 32, fontWeight: 700,
        color: 'var(--text)',
        letterSpacing: '-0.04em',
        lineHeight: 1,
        marginBottom: sub ? 8 : 0,
      }}>
        {value ?? '—'}
      </div>

      {sub && (
        <div style={{
          fontSize: 12, color: 'var(--text-3)',
          fontWeight: 500,
        }}>
          {sub}
        </div>
      )}
    </motion.div>
  )
}
