type HourlyBucket = {
  hour: number
  label: string
  totalCalls: number
  answeredCalls: number
  conversions: number
  answerRate: number
  averageDurationSeconds?: number
}

type Props = {
  buckets?: HourlyBucket[]
}

export default function HourlyAnalyticsChart({ buckets = [] }: Props) {
  const maxCalls = Math.max(1, ...buckets.map(bucket => bucket.totalCalls || 0))

  return (
    <section className="ptdt-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, color: 'var(--text)', fontSize: 22, fontWeight: 900 }}>Hourly Answer-Rate <span className="gradient-brand-text">Heatmap</span></h3>
          <p style={{ margin: '6px 0 0', color: 'var(--text-3)', fontSize: 13.5 }}>Calls, answers, conversions, and average duration by hour.</p>
        </div>
        <span className="ptdt-chip">24-hour buckets</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {buckets.map(bucket => {
          const fill = Math.max(8, Math.round((bucket.totalCalls / maxCalls) * 100))
          return (
            <div key={bucket.hour} className="glass" style={{ padding: 14, borderRadius: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-2)', fontWeight: 900 }}>{bucket.label}</span>
                <span style={{ color: 'var(--green-2)', fontSize: 11.5, fontWeight: 900 }}>{bucket.answerRate || 0}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: 'rgba(128,128,160,0.18)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${fill}%`,
                    height: '100%',
                    borderRadius: 999,
                    background: 'linear-gradient(90deg, rgba(0,167,71,0.92), rgba(0,245,160,0.9))',
                    boxShadow: '0 0 18px rgba(0,167,71,0.22)',
                  }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 12 }}>
                <MiniInfo label="Calls" value={bucket.totalCalls} />
                <MiniInfo label="Answered" value={bucket.answeredCalls} />
                <MiniInfo label="Conv." value={bucket.conversions} />
                <MiniInfo label="Avg" value={`${bucket.averageDurationSeconds || 0}s`} />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function MiniInfo({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: '10px 11px', background: 'rgba(255,255,255,0.52)' }}>
      <div className="mono" style={{ fontSize: 9.5, color: 'var(--text-3)', fontWeight: 900 }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text)', fontWeight: 850 }}>{value}</div>
    </div>
  )
}
