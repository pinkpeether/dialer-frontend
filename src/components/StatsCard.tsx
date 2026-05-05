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
}

export default function StatsCard({
  label, value, sub, icon, color, bg, index = 0,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      whileHover={{ y: -4 }}
      className="glass lift"
      style={{
        position: 'relative',
        padding: 22,
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
      }}
    >
      {/* Top glow accent */}
      <div style={{
        position: 'absolute', top: 0, left: 16, right: 16, height: 1,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        opacity: 0.7,
      }}/>

      {/* Soft radial glow behind icon */}
      <div style={{
        position: 'absolute', top: -30, right: -30,
        width: 140, height: 140, borderRadius: '50%',
        background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
        pointerEvents: 'none',
      }}/>

      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: 14,
        position: 'relative',
      }}>
        <span style={{
          fontSize: 11, color: 'var(--text-muted)', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: 1.2,
        }}>
          {label}
        </span>
        <div style={{
          background: bg, color,
          padding: 9, borderRadius: 12,
          border: `1px solid ${color}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 20px ${color}33`,
        }}>
          {icon}
        </div>
      </div>

      <div className="display" style={{
        fontSize: 32, fontWeight: 700,
        color: 'var(--text-primary)',
        letterSpacing: '-0.03em',
        lineHeight: 1,
        marginBottom: sub ? 8 : 0,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value ?? '—'}
      </div>

      {sub && (
        <div style={{
          fontSize: 12, color: 'var(--text-muted)',
          fontWeight: 500,
        }}>
          {sub}
        </div>
      )}
    </motion.div>
  )
}
