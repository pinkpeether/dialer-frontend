type ReadinessStatus = 'READY' | 'CONFIGURED' | 'MISSING' | 'WARNING' | 'OPTIONAL'

type ReadinessItem = {
  key: string
  label: string
  status: ReadinessStatus
  detail: string
  action?: string
}

type ReadinessSection = {
  key: string
  title: string
  summary: string
  status: ReadinessStatus
  items: ReadinessItem[]
}

type Props = {
  overview: {
    overallStatus: ReadinessStatus
    totals: Record<string, number>
    sections: ReadinessSection[]
    generatedAt: string
  } | null
}

const tone = (status: ReadinessStatus) => {
  if (status === 'READY') return { bg: 'rgba(0,167,71,0.12)', border: 'rgba(0,167,71,0.28)', color: 'var(--green-2)' }
  if (status === 'CONFIGURED') return { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.24)', color: '#60a5fa' }
  if (status === 'WARNING') return { bg: 'rgba(240,185,11,0.14)', border: 'rgba(240,185,11,0.26)', color: '#f0b90b' }
  if (status === 'MISSING') return { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.24)', color: '#ef4444' }
  return { bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.24)', color: 'var(--text-3)' }
}

export default function PlatformReadinessPanel({ overview }: Props) {
  if (!overview) {
    return <div className="ptdt-card" style={{ padding: 22, color: 'var(--text-3)' }}>Deployment readiness overview is loading...</div>
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="glass" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <div className="mono" style={{ color: 'var(--text-3)', fontSize: 11, marginBottom: 8, letterSpacing: 1 }}>OVERALL DEPLOYMENT STATUS</div>
            <h2 style={{ margin: 0 }}>Deployment / Platform Readiness</h2>
            <p style={{ margin: '8px 0 0', color: 'var(--text-3)' }}>Generated: {new Date(overview.generatedAt).toLocaleString()}</p>
          </div>
          <StatusBadge status={overview.overallStatus} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginTop: 16 }}>
          {Object.entries(overview.totals || {}).map(([key, value]) => (
            <div key={key} style={{ border: '1px solid var(--border)', borderRadius: 14, background: 'var(--bg-glass)', padding: 14, textAlign: 'center' }}>
              <div className="mono" style={{ fontSize: 22, fontWeight: 900 }}>{value}</div>
              <div style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 6 }}>{key}</div>
            </div>
          ))}
        </div>
      </div>

      {overview.sections.map(section => (
        <div key={section.key} className="glass" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0 }}>{section.title}</h3>
              <p style={{ margin: '6px 0 0', color: 'var(--text-3)', lineHeight: 1.6 }}>{section.summary}</p>
            </div>
            <StatusBadge status={section.status} />
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {section.items.map(item => (
              <div key={item.key} style={{ border: '1px solid var(--border)', borderRadius: 14, background: 'var(--bg-glass)', padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 800 }}>{item.label}</div>
                  <StatusBadge status={item.status} />
                </div>
                <p style={{ margin: '8px 0 0', color: 'var(--text-3)', lineHeight: 1.6 }}>{item.detail}</p>
                {item.action && <p style={{ margin: '8px 0 0', color: 'var(--text-2)', lineHeight: 1.6 }}><strong>Action:</strong> {item.action}</p>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function StatusBadge({ status }: { status: ReadinessStatus }) {
  const s = tone(status)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999, padding: '7px 12px', background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontWeight: 900, fontSize: 11 }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: s.color }} />
      {status}
    </span>
  )
}
