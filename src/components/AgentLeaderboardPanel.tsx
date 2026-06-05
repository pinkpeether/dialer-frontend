type LeaderboardEntry = {
  rank: number
  agentId: number
  name: string
  email: string
  agentCode?: string | null
  status?: string | null
  totalCalls: number
  answeredCalls: number
  callbacks: number
  answerRate: number
  talkSeconds: number
  points: number
  badge: string
}

type Props = {
  entries: LeaderboardEntry[]
  loading?: boolean
}

const formatDuration = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds || 0))
  const minutes = Math.floor(safe / 60)
  const remaining = safe % 60
  return `${minutes}m ${remaining}s`
}

const rankBadge = (rank: number) => {
  if (rank === 1) return '1st'
  if (rank === 2) return '2nd'
  if (rank === 3) return '3rd'
  return `#${rank}`
}

export default function AgentLeaderboardPanel({ entries, loading }: Props) {
  return (
    <section className="ptdt-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 10 }}>Gamification</div>
          <h2 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 26 }}>Agent Leaderboard</h2>
          <p style={{ color: 'var(--text-3)', marginTop: 8 }}>
            Score = answered calls + callbacks + talk time - DNC penalty.
          </p>
        </div>
        <span className="ptdt-chip">Live ranking</span>
      </div>

      {loading ? (
        <div className="ptdt-card" style={{ padding: 18, color: 'var(--text-3)' }}>Loading leaderboard…</div>
      ) : entries.length === 0 ? (
        <div className="ptdt-card" style={{ padding: 18, color: 'var(--text-3)' }}>No leaderboard data yet.</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {entries.map(entry => (
            <div key={entry.agentId} className="ptdt-card" style={{ padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '72px minmax(0,1fr) auto', gap: 14, alignItems: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900 }}>{rankBadge(entry.rank)}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                    <strong style={{ fontSize: 17 }}>{entry.name}</strong>
                    <span className="ptdt-chip">{entry.badge}</span>
                    <span className="ptdt-chip">{entry.status || 'UNKNOWN'}</span>
                  </div>
                  <div style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 8 }}>{entry.email}</div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', color: 'var(--text-3)', fontSize: 12.5, fontWeight: 700 }}>
                    <span>Calls: {entry.totalCalls}</span>
                    <span>Answered: {entry.answeredCalls}</span>
                    <span>Callbacks: {entry.callbacks}</span>
                    <span>Talk: {formatDuration(entry.talkSeconds)}</span>
                  </div>
                </div>
                <div style={{ minWidth: 90, textAlign: 'center', borderRadius: 16, background: 'var(--bg-glass-hi)', border: '1px solid var(--border)', padding: '12px 14px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900 }}>{entry.points}</div>
                  <div className="mono" style={{ color: 'var(--text-3)', fontSize: 10.5 }}>{entry.answerRate}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
