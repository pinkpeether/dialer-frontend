export type HourlyHeatmapSlot = {
  hour: number
  label: string
  totalCalls: number
  answeredCalls: number
  completedCalls: number
  answerRate: number
  intensity: number
}

type Props = {
  slots: HourlyHeatmapSlot[]
}

const shellStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 24,
  background: 'var(--bg-glass-hi)',
  padding: 18,
  boxShadow: 'var(--shadow-md)',
}

export default function HourlyHeatmapPanel({ slots }: Props) {
  return (
    <section style={shellStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--text)', fontSize: 20, fontFamily: 'var(--font-display)' }}>Hourly Answer-Rate Heatmap</h2>
          <p style={{ margin: '6px 0 0', color: 'var(--text-3)', fontSize: 13 }}>
            Last 24 hours by call start hour.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(82px, 1fr))', gap: 10, marginTop: 16 }}>
        {slots.map(slot => {
          const opacity = Math.max(0.08, slot.intensity / 100)
          return (
            <div
              key={`${slot.hour}-${slot.label}`}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: 10,
                background: `linear-gradient(180deg, rgba(251, 10, 139, ${Math.max(0.08, opacity)}), rgba(128,87,215,${Math.max(0.04, opacity * 0.7)}))`,
                minHeight: 86,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>{slot.label}</div>
              <div style={{ marginTop: 8, fontSize: 20, fontWeight: 900, color: 'var(--text)' }}>{slot.totalCalls}</div>
              <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-2)' }}>{slot.answerRate}% answer</div>
              <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{slot.answeredCalls} answered</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
