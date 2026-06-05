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
  border: '1px solid rgba(148, 163, 184, 0.24)',
  borderRadius: 18,
  background: '#ffffff',
  padding: 18,
  boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)',
}

export default function HourlyHeatmapPanel({ slots }: Props) {
  return (
    <section style={shellStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: 20 }}>Hourly Answer-Rate Heatmap</h2>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13 }}>
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
                border: '1px solid rgba(148, 163, 184, 0.28)',
                borderRadius: 14,
                padding: 10,
                background: `rgba(251, 10, 139, ${opacity})`,
                minHeight: 86,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{slot.label}</div>
              <div style={{ marginTop: 8, fontSize: 20, fontWeight: 900, color: '#0f172a' }}>{slot.totalCalls}</div>
              <div style={{ marginTop: 4, fontSize: 11, color: '#334155' }}>{slot.answerRate}% answer</div>
              <div style={{ fontSize: 11, color: '#334155' }}>{slot.answeredCalls} answered</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
