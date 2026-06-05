type CampaignRow = {
  campaignId: number
  name: string
  status?: string | null
  totalCalls: number
  answeredCalls: number
  missedCalls: number
  conversions: number
  answerRate: number
  conversionRate: number
}

type DurationData = {
  summary?: {
    callsWithDuration?: number
    averageDurationSeconds?: number
    minDurationSeconds?: number
    maxDurationSeconds?: number
    p50DurationSeconds?: number
    p90DurationSeconds?: number
  }
  buckets?: Array<{ label: string; count: number }>
}

type MissedData = {
  totalMissedCalls?: number
  repeatMissedNumbers?: Array<{
    number: string
    missedCount: number
    lastMissedAt?: string | null
  }>
}

type Props = {
  campaigns?: CampaignRow[]
  duration?: DurationData
  missed?: MissedData
}

export default function ConversionAndDurationPanel({ campaigns = [], duration, missed }: Props) {
  const maxBucket = Math.max(1, ...(duration?.buckets || []).map(bucket => bucket.count || 0))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(320px, 1fr)', gap: 16, alignItems: 'start' }}>
      <section className="ptdt-card" style={{ padding: 20 }}>
        <div style={{ marginBottom: 14 }}>
          <h3 style={{ margin: 0, color: 'var(--text)', fontSize: 22, fontWeight: 900 }}>Campaign <span className="gradient-brand-text">Conversion Report</span></h3>
          <p style={{ margin: '6px 0 0', color: 'var(--text-3)', fontSize: 13.5 }}>Campaign-level answer and conversion performance.</p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Campaign', 'Calls', 'Answered', 'Missed', 'Conversions', 'Answer Rate', 'Conv. Rate'].map(label => (
                  <th key={label} className="mono" style={headCellStyle}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map(campaign => (
                <tr key={campaign.campaignId}>
                  <td style={cellStyle}>
                    <div style={{ fontSize: 13.5, fontWeight: 850, color: 'var(--text)' }}>{campaign.name}</div>
                    <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 4 }}>
                      {campaign.status || `#${campaign.campaignId}`}
                    </div>
                  </td>
                  <td style={cellStyle}>{campaign.totalCalls}</td>
                  <td style={cellStyle}>{campaign.answeredCalls}</td>
                  <td style={cellStyle}>{campaign.missedCalls}</td>
                  <td style={cellStyle}>{campaign.conversions}</td>
                  <td style={cellStyle}>{campaign.answerRate}%</td>
                  <td style={{ ...cellStyle, color: 'var(--pink)', fontWeight: 900 }}>{campaign.conversionRate}%</td>
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ ...cellStyle, textAlign: 'center', color: 'var(--text-3)' }}>No conversion data for this range.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div style={{ display: 'grid', gap: 16 }}>
        <section className="ptdt-card" style={{ padding: 20 }}>
          <h3 style={{ margin: 0, color: 'var(--text)', fontSize: 22, fontWeight: 900 }}>Duration Analysis</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 14 }}>
            <MiniMetric label="Average" value={`${duration?.summary?.averageDurationSeconds || 0}s`} />
            <MiniMetric label="P90" value={`${duration?.summary?.p90DurationSeconds || 0}s`} />
            <MiniMetric label="Min" value={`${duration?.summary?.minDurationSeconds || 0}s`} />
            <MiniMetric label="Max" value={`${duration?.summary?.maxDurationSeconds || 0}s`} />
          </div>
          <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
            {(duration?.buckets || []).map(bucket => (
              <div key={bucket.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11.5, color: 'var(--text-3)', fontWeight: 800 }}>
                  <span>{bucket.label}</span>
                  <span>{bucket.count}</span>
                </div>
                <div style={{ marginTop: 5, height: 8, borderRadius: 999, background: 'rgba(128,128,160,0.18)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.max(4, (bucket.count / maxBucket) * 100)}%`,
                      borderRadius: 999,
                      background: 'linear-gradient(90deg, rgba(128,87,215,0.95), rgba(251,11,140,0.9))',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="ptdt-card" style={{ padding: 20 }}>
          <h3 style={{ margin: 0, color: 'var(--text)', fontSize: 22, fontWeight: 900 }}>Missed-Call Repeat Report</h3>
          <p style={{ margin: '6px 0 0', color: 'var(--text-3)', fontSize: 13.5 }}>Total missed: {missed?.totalMissedCalls || 0}</p>
          <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
            {(missed?.repeatMissedNumbers || []).slice(0, 8).map(row => (
              <div key={row.number} className="glass" style={{ padding: 13, borderRadius: 16, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ color: 'var(--text)', fontSize: 13, fontWeight: 850 }}>{row.number}</div>
                  <div style={{ color: 'var(--text-3)', fontSize: 11.5, marginTop: 4 }}>
                    {row.lastMissedAt ? new Date(row.lastMissedAt).toLocaleString() : 'No timestamp'}
                  </div>
                </div>
                <div style={{ color: 'var(--pink)', fontSize: 13.5, fontWeight: 900 }}>{row.missedCount} missed</div>
              </div>
            ))}
            {(missed?.repeatMissedNumbers || []).length === 0 && (
              <div className="glass" style={{ padding: 14, borderRadius: 16, color: 'var(--text-3)', fontSize: 12.5 }}>
                No repeat missed numbers found.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass" style={{ padding: 12, borderRadius: 16 }}>
      <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 900 }}>{label}</div>
      <div style={{ marginTop: 5, color: 'var(--text)', fontSize: 18, fontWeight: 900 }}>{value}</div>
    </div>
  )
}

const headCellStyle: CSSProperties = {
  textAlign: 'left',
  padding: '12px 14px',
  borderBottom: '1px solid var(--border)',
  color: 'var(--text-3)',
  fontSize: 10.5,
  fontWeight: 950,
  letterSpacing: 0.9,
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
}

const cellStyle: CSSProperties = {
  padding: '12px 14px',
  borderTop: '1px solid rgba(16,16,24,0.06)',
  color: 'var(--text)',
  fontSize: 12.5,
  fontWeight: 800,
  verticalAlign: 'top',
  whiteSpace: 'nowrap',
}
import type { CSSProperties } from 'react'
