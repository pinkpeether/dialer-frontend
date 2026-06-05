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
  border: '1px solid rgba(148, 163, 184, 0.24)',
  borderRadius: 18,
  background: 'rgba(15, 23, 42, 0.94)',
  padding: 18,
  boxShadow: '0 18px 45px rgba(15, 23, 42, 0.16)',
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
  background: 'rgba(30, 41, 59, 0.76)',
}

export default function LiveCallMapPanel({ buckets }: Props) {
  return (
    <section style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, color: '#f8fafc', fontSize: 20 }}>Live Call Map</h2>
          <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: 13 }}>
            Region buckets are inferred from customer number prefixes until geocoding is added.
          </p>
        </div>
        <span style={{ color: '#22c55e', fontWeight: 700 }}>{buckets.length} live regions</span>
      </div>

      {buckets.length === 0 ? (
        <div style={{ marginTop: 18, color: '#cbd5e1', fontSize: 14 }}>No active calls on the map right now.</div>
      ) : (
        <div style={gridStyle}>
          {buckets.map(bucket => (
            <div key={bucket.key} style={bucketStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <strong style={{ color: '#f8fafc' }}>{bucket.label}</strong>
                <span style={{ color: '#f472b6', fontWeight: 800 }}>{bucket.activeCalls}</span>
              </div>
              <div style={{ marginTop: 8, color: '#cbd5e1', fontSize: 12 }}>
                Lat {bucket.lat.toFixed(2)} / Lng {bucket.lng.toFixed(2)}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <span style={{ color: '#fde68a', fontSize: 12 }}>Ringing: {bucket.ringingCalls}</span>
                <span style={{ color: '#86efac', fontSize: 12 }}>Answered: {bucket.answeredCalls}</span>
              </div>
              {bucket.sampleNumbers && bucket.sampleNumbers.length > 0 && (
                <div style={{ marginTop: 10, color: '#94a3b8', fontSize: 12, wordBreak: 'break-word' }}>
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
