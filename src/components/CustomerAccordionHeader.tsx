import type { ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

type CustomerBadge = {
  label: ReactNode
  color?: string
  bg?: string
  border?: string
}

export default function CustomerAccordionHeader({
  isOpen,
  onClick,
  name,
  meta,
  badges,
}: {
  isOpen: boolean
  onClick: () => void
  name: ReactNode
  meta?: ReactNode
  badges?: CustomerBadge[]
}) {
  return (
    <>
      <style>{`
        .ptdt-customer-accordion-header:hover {
          background: rgba(148, 163, 184, 0.14) !important;
        }
        .ptdt-customer-accordion-chevron svg {
          stroke-width: 3.35;
        }
      `}</style>
      <button
        type="button"
        className="ptdt-customer-accordion-header"
        onClick={onClick}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: 16,
          background: isOpen ? 'rgba(148, 163, 184, 0.16)' : 'transparent',
          border: 0,
          borderBottom: isOpen ? '1px solid var(--border)' : 0,
          color: 'var(--text)',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background .18s ease, box-shadow .18s ease',
          boxShadow: isOpen ? 'inset 0 1px 0 rgba(255,255,255,0.42)' : 'none',
        }}
      >
        <span
          className="ptdt-customer-accordion-chevron"
          style={{
            width: 34,
            height: 34,
            minWidth: 34,
            borderRadius: 999,
            display: 'grid',
            placeItems: 'center',
            color: 'var(--danger)',
            background: isOpen ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.24)',
          }}
        >
          {isOpen ? <ChevronDown size={25} /> : <ChevronRight size={25} />}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ fontSize: 16 }}>{name}</strong>
          {meta && <span className="mono" style={{ display: 'block', color: 'var(--text-3)', fontSize: 11, marginTop: 4 }}>{meta}</span>}
        </span>
        <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {badges?.map((badge, index) => (
            <span
              key={index}
              className="badge"
              style={{
                color: badge.color || 'var(--pink)',
                background: badge.bg || 'rgba(251,11,140,.10)',
                border: badge.border || '1px solid rgba(251,11,140,.28)',
              }}
            >
              {badge.label}
            </span>
          ))}
        </span>
      </button>
    </>
  )
}

export const customerAccordionBodyStyle = {
  background: 'rgba(148, 163, 184, 0.08)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.32)',
} as const
