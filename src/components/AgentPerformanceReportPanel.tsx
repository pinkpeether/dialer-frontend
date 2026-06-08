type AgentRow = {
  agentId: number
  name: string
  agentCode?: string | null
  totalCalls: number
  answeredCalls: number
  missedCalls: number
  conversions: number
  answerRate: number
  conversionRate: number
  averageDurationSeconds: number
  talkTimeSeconds: number
  score: number
}

type Props = {
  agents?: AgentRow[]
}

export default function AgentPerformanceReportPanel({ agents = [] }: Props) {
  return (
    <section className="ptdt-card" style={{ padding: 20 }}>
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ margin: 0, color: 'var(--text)', fontSize: 22, fontWeight: 900 }}>Per-Agent <span className="gradient-brand-text">Performance</span></h3>
        <p style={{ margin: '6px 0 0', color: 'var(--text-3)', fontSize: 13.5 }}>Daily, weekly, monthly-ready view with ranking score.</p>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 940, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Agent', 'Calls', 'Answered', 'Missed', 'Conversions', 'Answer Rate', 'Conv. Rate', 'Avg Dur.', 'Talk Time', 'Score'].map(label => (
                <th
                  key={label}
                  className="mono"
                  style={{
                    textAlign: 'left',
                    padding: '12px 14px',
                    borderBottom: '1px solid var(--border)',
                    color: 'var(--text-3)',
                    fontSize: 10.5,
                    fontWeight: 950,
                    letterSpacing: 0.9,
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agents.map(agent => (
              <tr key={agent.agentId}>
                <td style={cellStyle}>
                  <div style={{ fontSize: 13.5, fontWeight: 850, color: 'var(--text)' }}>{agent.name}</div>
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 4 }}>
                    {agent.agentCode || `#${agent.agentId}`}
                  </div>
                </td>
                <td style={cellStyle}>{agent.totalCalls}</td>
                <td style={cellStyle}>{agent.answeredCalls}</td>
                <td style={cellStyle}>{agent.missedCalls}</td>
                <td style={cellStyle}>{agent.conversions}</td>
                <td style={cellStyle}>{agent.answerRate}%</td>
                <td style={cellStyle}>{agent.conversionRate}%</td>
                <td style={cellStyle}>{agent.averageDurationSeconds}s</td>
                <td style={cellStyle}>{agent.talkTimeSeconds}s</td>
                <td style={{ ...cellStyle, color: 'var(--pink)', fontWeight: 900 }}>{agent.score}</td>
              </tr>
            ))}
            {agents.length === 0 && (
              <tr>
                <td style={{ ...cellStyle, textAlign: 'center', color: 'var(--text-3)' }} colSpan={10}>
                  No agent performance data for this range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
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
