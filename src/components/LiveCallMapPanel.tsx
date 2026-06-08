export type LiveCallMapBucket = {
  key: string
  label: string
  lat: number
  lng: number
  activeCalls: number
  ringingCalls: number
  answeredCalls: number
  sampleNumbers?: string[]
}

type Props = {
  buckets: LiveCallMapBucket[]
}

const cardStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 24,
  background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-glass-hi) 94%, transparent), color-mix(in srgb, var(--surface) 96%, transparent))',
  padding: 18,
  boxShadow: 'var(--shadow-md)',
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 12,
  marginTop: 14,
}

const bucketStyle: React.CSSProperties = {
  border: '1px solid rgba(148, 163, 184, 0.18)',
  borderRadius: 16,
  padding: 14,
  background: 'var(--bg-2)',
}

export default function LiveCallMapPanel({ buckets }: Props) {
  return (
    <section style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--text)', fontSize: 20, fontFamily: 'var(--font-display)' }}>Live Call Map</h2>
          <p style={{ margin: '6px 0 0', color: 'var(--text-3)', fontSize: 13 }}>
            Region buckets are inferred from customer number prefixes until geocoding is added.
          </p>
        </div>
        <span className="ptdt-pro-pill" style={{ color: 'var(--green-2)' }}>{buckets.length} live regions</span>
      </div>

      {buckets.length === 0 ? (
        <div style={{ marginTop: 18, color: 'var(--text-3)', fontSize: 14 }}>No active calls on the map right now.</div>
      ) : (
        <div style={gridStyle}>
          {buckets.map(bucket => (
            <div key={bucket.key} style={bucketStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <strong style={{ color: 'var(--text)' }}>{bucket.label}</strong>
                <span style={{ color: 'var(--pink)', fontWeight: 800 }}>{bucket.activeCalls}</span>
              </div>
              <div style={{ marginTop: 8, color: 'var(--text-3)', fontSize: 12 }}>
                Lat {bucket.lat.toFixed(2)} / Lng {bucket.lng.toFixed(2)}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <span style={{ color: 'var(--gold)', fontSize: 12 }}>Ringing: {bucket.ringingCalls}</span>
                <span style={{ color: 'var(--green-2)', fontSize: 12 }}>Answered: {bucket.answeredCalls}</span>
              </div>
              {bucket.sampleNumbers && bucket.sampleNumbers.length > 0 && (
                <div style={{ marginTop: 10, color: 'var(--text-3)', fontSize: 12, wordBreak: 'break-word' }}>
                  {bucket.sampleNumbers.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
