export type LiveAgentActivity = {
  id: number
  name: string
  email: string
  agentCode?: string | null
  extension?: string | null
  status: string
  isLive: boolean
  activeSessions: number
  activeCalls: number
  todaysCalls: number
  answeredCalls: number
  answerRate: number
  averageDurationSeconds: number
  lastSeenAt: string
  lastCallAt?: string | null
}

type Props = {
  agents: LiveAgentActivity[]
}

const getStatusColor = (status: string) => {
  if (status === 'READY') return '#16a34a'
  if (status === 'BUSY') return '#dc2626'
  if (status === 'WRAP_UP') return '#ea580c'
  if (status === 'ONLINE') return '#2563eb'
  return '#64748b'
}

export default function LiveAgentActivityPanel({ agents }: Props) {
  return (
    <section style={{ border: '1px solid rgba(148, 163, 184, 0.24)', borderRadius: 18, background: '#ffffff', padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: 20 }}>Live Agent Activity Table</h2>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13 }}>
            Sessions, current calls, answer rate and last-seen activity.
          </p>
        </div>
        <strong style={{ color: '#0f172a' }}>{agents.length} agents</strong>
      </div>

      <div style={{ overflowX: 'auto', marginTop: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead>
            <tr>
              {['Agent', 'Status', 'Live', 'Active Calls', 'Today', 'Answer %', 'Avg Duration', 'Last Call'].map(header => (
                <th key={header} style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agents.map(agent => (
              <tr key={agent.id}>
                <td style={{ padding: '12px 8px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ color: '#0f172a', fontWeight: 800 }}>{agent.name}</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>{agent.agentCode || agent.email}</div>
                </td>
                <td style={{ padding: '12px 8px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ background: getStatusColor(agent.status), color: '#fff', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 800 }}>
                    {agent.status}
                  </span>
                </td>
                <td style={{ padding: '12px 8px', borderBottom: '1px solid #f1f5f9', color: agent.isLive ? '#16a34a' : '#64748b', fontWeight: 800 }}>
                  {agent.isLive ? `${agent.activeSessions} session(s)` : 'Offline'}
                </td>
                <td style={{ padding: '12px 8px', borderBottom: '1px solid #f1f5f9' }}>{agent.activeCalls}</td>
                <td style={{ padding: '12px 8px', borderBottom: '1px solid #f1f5f9' }}>{agent.todaysCalls}</td>
                <td style={{ padding: '12px 8px', borderBottom: '1px solid #f1f5f9' }}>{agent.answerRate}%</td>
                <td style={{ padding: '12px 8px', borderBottom: '1px solid #f1f5f9' }}>{agent.averageDurationSeconds}s</td>
                <td style={{ padding: '12px 8px', borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: 12 }}>
                  {agent.lastCallAt ? new Date(agent.lastCallAt).toLocaleString() : 'No call'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
