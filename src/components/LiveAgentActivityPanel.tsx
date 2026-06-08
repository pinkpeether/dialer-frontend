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
    <section className="ptdt-pro-table-shell" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--text)', fontSize: 20, fontFamily: 'var(--font-display)' }}>Live Agent Activity Table</h2>
          <p style={{ margin: '6px 0 0', color: 'var(--text-3)', fontSize: 13 }}>
            Sessions, current calls, answer rate and last-seen activity.
          </p>
        </div>
        <strong style={{ color: 'var(--text)' }}>{agents.length} agents</strong>
      </div>

      <div className="ptdt-pro-table-wrap" style={{ marginTop: 16 }}>
        <table className="ptdt-pro-table">
          <thead>
            <tr>
              {['Agent', 'Status', 'Live', 'Active Calls', 'Today', 'Answer %', 'Avg Duration', 'Last Call'].map(header => (
                <th key={header}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agents.map(agent => (
              <tr key={agent.id}>
                <td>
                  <div style={{ color: 'var(--text)', fontWeight: 800 }}>{agent.name}</div>
                  <div style={{ color: 'var(--text-3)', fontSize: 12, fontWeight: 600 }}>{agent.agentCode || agent.email}</div>
                </td>
                <td>
                  <span style={{ background: getStatusColor(agent.status), color: '#fff', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 800 }}>
                    {agent.status}
                  </span>
                </td>
                <td style={{ color: agent.isLive ? 'var(--green-2)' : 'var(--text-3)', fontWeight: 800 }}>
                  {agent.isLive ? `${agent.activeSessions} session(s)` : 'Offline'}
                </td>
                <td>{agent.activeCalls}</td>
                <td>{agent.todaysCalls}</td>
                <td>{agent.answerRate}%</td>
                <td>{agent.averageDurationSeconds}s</td>
                <td className="subtle">
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
