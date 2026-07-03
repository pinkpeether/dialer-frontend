import { useMemo, useState } from 'react'
import CustomerAccordionHeader, { customerAccordionBodyStyle } from './CustomerAccordionHeader'

type CustomerAccount = {
  id: number | null
  name: string
  code: string
  status: string
}

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
  commercialAccount?: CustomerAccount | null
  commercialAccounts?: CustomerAccount[]
}

type Props = {
  agents: LiveAgentActivity[]
}

type CustomerAgentGroup = CustomerAccount & {
  key: string
  agents: LiveAgentActivity[]
}

const getStatusColor = (status: string) => {
  if (status === 'READY') return '#16a34a'
  if (status === 'BUSY') return '#dc2626'
  if (status === 'WRAP_UP') return '#ea580c'
  if (status === 'ONLINE') return '#2563eb'
  return '#64748b'
}

const accountForAgent = (agent: LiveAgentActivity): CustomerAccount => {
  const account = agent.commercialAccount || agent.commercialAccounts?.[0]
  return account || { id: null, name: 'PTDT Super Admin', code: '—', status: '—' }
}

const groupAgentsByCustomer = (agents: LiveAgentActivity[]) => {
  const map = new Map<string, CustomerAgentGroup>()
  agents.forEach(agent => {
    const account = accountForAgent(agent)
    const key = account.id ? `account-${account.id}` : 'account-unassigned'
    if (!map.has(key)) map.set(key, { ...account, key, agents: [] })
    map.get(key)?.agents.push(agent)
  })
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
}

function ActivityTable({ agents }: { agents: LiveAgentActivity[] }) {
  return (
    <div className="ptdt-pro-table-wrap" style={{ marginTop: 0 }}>
      <table className="ptdt-pro-table">
        <thead>
          <tr>
            {['Agent', 'Status', 'Live', 'Active Calls', 'Today', 'Answer %', 'Avg Duration', 'Last Call'].map(header => (
              <th key={header}>{header}</th>
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
              <td className="subtle">{agent.lastCallAt ? new Date(agent.lastCallAt).toLocaleString() : 'No call'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function LiveAgentActivityPanel({ agents }: Props) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const groupedAgents = useMemo(() => groupAgentsByCustomer(agents), [agents])
  const toggleGroup = (key: string) => setExpandedGroups(prev => ({ ...prev, [key]: !(prev[key] ?? true) }))

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

      {agents.length === 0 ? (
        <div className="ptdt-pro-table-wrap" style={{ marginTop: 16, padding: 18, color: 'var(--text-3)', textAlign: 'center' }}>
          No agents found.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          {groupedAgents.map((group, index) => {
            const isOpen = expandedGroups[group.key] ?? index === 0
            const online = group.agents.filter(agent => ['ONLINE', 'READY', 'BUSY', 'WRAP_UP'].includes(agent.status)).length
            const live = group.agents.filter(agent => agent.isLive).length
            const activeCalls = group.agents.reduce((sum, agent) => sum + agent.activeCalls, 0)
            const today = group.agents.reduce((sum, agent) => sum + agent.todaysCalls, 0)

            return (
              <div key={group.key} className="glass" style={{ overflow: 'hidden', padding: 0 }}>
                <CustomerAccordionHeader
                  isOpen={isOpen}
                  onClick={() => toggleGroup(group.key)}
                  name={group.name}
                  meta={`Customer Code: ${group.code} · Status: ${group.status}`}
                  badges={[
                    { label: `${group.agents.length} Agents` },
                    { label: `${online} Online`, color: '#2563eb', bg: 'rgba(37,99,235,.10)', border: '1px solid rgba(37,99,235,.28)' },
                    { label: `${live} Live`, color: 'var(--green-2)', bg: 'rgba(0,167,71,.10)', border: '1px solid rgba(0,167,71,.28)' },
                    { label: `${activeCalls} Active Calls`, color: 'var(--pink)', bg: 'rgba(251,11,140,.10)', border: '1px solid rgba(251,11,140,.28)' },
                    { label: `${today} Today`, color: 'var(--text-2)', bg: 'var(--bg-2)', border: '1px solid var(--border)' },
                  ]}
                />
                {isOpen && (
                  <div style={{ ...customerAccordionBodyStyle, padding: 0 }}>
                    <ActivityTable agents={group.agents} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
