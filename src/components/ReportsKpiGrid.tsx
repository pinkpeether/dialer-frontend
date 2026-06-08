import { BarChart3, Clock3, PhoneCall, PhoneMissed, RefreshCw, Target } from 'lucide-react'
import type { ReactNode } from 'react'

type Kpis = {
  totalCalls?: number
  answeredCalls?: number
  missedCalls?: number
  conversions?: number
  answerRate?: number
  conversionRate?: number
  missedRate?: number
  averageDurationSeconds?: number
}

type Props = {
  kpis?: Kpis
}

function fmtNumber(value: unknown, suffix = '') {
  return `${Number(value || 0).toLocaleString()}${suffix}`
}

function StatCard({
  label,
  value,
  note,
  icon,
  accent,
}: {
  label: string
  value: string
  note: string
  icon: ReactNode
  accent: string
}) {
  return (
    <div className="ptdt-card" style={{ padding: 18, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 'auto -30px -48px auto', width: 118, height: 118, borderRadius: '50%', background: `${accent}1c`, filter: 'blur(18px)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            display: 'grid',
            placeItems: 'center',
            background: `${accent}12`,
            color: accent,
            border: `1px solid ${accent}44`,
            boxShadow: `0 8px 20px ${accent}18`,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 1.05, textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 900 }}>
            {label}
          </div>
          <div style={{ marginTop: 4, fontSize: 25, lineHeight: 1, color: 'var(--text)', fontWeight: 950 }}>
            {value}
          </div>
          <div style={{ marginTop: 7, fontSize: 12.5, color: 'var(--text-3)', fontWeight: 700 }}>
            {note}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ReportsKpiGrid({ kpis }: Props) {
  const cards = [
    {
      label: 'Total Calls',
      value: fmtNumber(kpis?.totalCalls),
      note: `${fmtNumber(kpis?.answeredCalls)} answered`,
      icon: <PhoneCall size={18} />,
      accent: '#fb0b8c',
    },
    {
      label: 'Answer Rate',
      value: fmtNumber(kpis?.answerRate, '%'),
      note: `${fmtNumber(kpis?.missedRate, '%')} missed rate`,
      icon: <BarChart3 size={18} />,
      accent: '#00a747',
    },
    {
      label: 'Conversions',
      value: fmtNumber(kpis?.conversions),
      note: `${fmtNumber(kpis?.conversionRate, '%')} conversion rate`,
      icon: <Target size={18} />,
      accent: '#8057d7',
    },
    {
      label: 'Missed Calls',
      value: fmtNumber(kpis?.missedCalls),
      note: `${fmtNumber(kpis?.averageDurationSeconds, 's')} avg duration`,
      icon: <PhoneMissed size={18} />,
      accent: '#f0b90b',
    },
    {
      label: 'Avg Duration',
      value: fmtNumber(kpis?.averageDurationSeconds, 's'),
      note: `${fmtNumber(kpis?.answeredCalls)} completed samples`,
      icon: <Clock3 size={18} />,
      accent: '#14b8a6',
    },
    {
      label: 'Refresh Base',
      value: fmtNumber(kpis?.totalCalls),
      note: 'Based on filtered report range',
      icon: <RefreshCw size={18} />,
      accent: '#6366f1',
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
      {cards.map(card => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  )
}
