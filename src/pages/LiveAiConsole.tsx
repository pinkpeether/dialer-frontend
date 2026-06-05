import { useEffect, useState } from 'react'
import { Brain, RefreshCw, Radio } from 'lucide-react'
import LiveAiAssistantPanel from '../components/LiveAiAssistantPanel'
import { liveAiAPI } from '../api/liveAi.api'
import type { LiveAiSession } from '../api/liveAi.api'

export default function LiveAiConsole() {
  const [sessions, setSessions] = useState<LiveAiSession[]>([])
  const [selectedCallId, setSelectedCallId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadSessions = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await liveAiAPI.listSessions()
      setSessions(result)
      setSelectedCallId(current => current ?? result[0]?.callId ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Live AI sessions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSessions()
    const timer = window.setInterval(() => {
      void loadSessions()
    }, 8000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="page-shell">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 12 }}>
            <Brain size={12} /> PTDT Live AI
          </div>
          <h1 className="ptdt-page-title" style={{ margin: 0 }}>
            Live <span className="gradient-brand-text">AI Console</span>
          </h1>
          <p style={{ color: 'var(--text-3)', marginTop: 12, maxWidth: 780, lineHeight: 1.65 }}>
            Realtime transcript ingestion, answer detection, live sentiment, smart script hints, auto disposition, and callback suggestions from one operator console.
          </p>
        </div>

        <button type="button" className="btn-brand" onClick={() => void loadSessions()} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <RefreshCw size={16} />
          {loading ? 'Refreshing…' : 'Refresh Sessions'}
        </button>
      </div>

      {error && (
        <div style={{ border: '1px solid rgba(239,68,68,.30)', background: 'rgba(239,68,68,.08)', color: '#ef4444', borderRadius: 16, padding: 14, marginBottom: 18 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 22 }}>
        <div className="glass" style={{ padding: 18, borderRadius: 20 }}>
          <div className="mono" style={{ color: 'var(--text-3)', fontSize: 11, marginBottom: 8 }}>ACTIVE SESSIONS</div>
          <div style={{ fontSize: 34, fontWeight: 900 }}>{sessions.length}</div>
        </div>
        <div className="glass" style={{ padding: 18, borderRadius: 20 }}>
          <div className="mono" style={{ color: 'var(--text-3)', fontSize: 11, marginBottom: 8 }}>LIVE STATUS</div>
          <div style={{ fontSize: 20, fontWeight: 900 }}>{sessions.some(session => session.status === 'LIVE') ? 'Monitoring' : 'Idle'}</div>
        </div>
        <div className="glass" style={{ padding: 18, borderRadius: 20 }}>
          <div className="mono" style={{ color: 'var(--text-3)', fontSize: 11, marginBottom: 8 }}>LAST UPDATE</div>
          <div style={{ fontSize: 20, fontWeight: 900 }}>
            {sessions[0]?.updatedAt ? new Date(sessions[0].updatedAt).toLocaleTimeString() : '—'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 0.35fr) minmax(0, 1fr)', gap: 16 }} className="live-ai-page-grid">
        <aside className="glass-hi" style={{ borderRadius: 24, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Radio size={18} color="var(--pink)" />
            <h2 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>Active Sessions</h2>
          </div>

          {sessions.length === 0 ? (
            <p style={{ color: 'var(--text-3)', lineHeight: 1.6 }}>
              No active Live AI sessions yet. Enter a Call ID on the right and start a session.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {sessions.map(session => {
                const active = selectedCallId === session.callId
                return (
                  <button
                    key={session.callId}
                    type="button"
                    onClick={() => setSelectedCallId(session.callId)}
                    className={active ? 'btn-brand' : 'btn-ghost'}
                    style={{
                      justifyContent: 'space-between',
                      gap: 14,
                      flexWrap: 'wrap',
                      textAlign: 'left',
                      minHeight: 54,
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Radio size={16} />
                      Call #{session.callId}
                    </span>
                    <span className="mono">{session.sentiment} · {session.status}</span>
                  </button>
                )
              })}
            </div>
          )}
        </aside>

        <LiveAiAssistantPanel callId={selectedCallId} />
      </div>

      <style>{`
        @media (max-width: 900px) {
          .live-ai-page-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
