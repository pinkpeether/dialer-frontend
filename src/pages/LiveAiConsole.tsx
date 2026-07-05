import { useCallback, useEffect, useRef, useState } from 'react'
import { Brain, RefreshCw, Radio } from 'lucide-react'
import LiveAiAssistantPanel from '../components/LiveAiAssistantPanel'
import { liveAiAPI } from '../api/liveAi.api'
import type { LiveAiSession } from '../api/liveAi.api'

export default function LiveAiConsole() {
  const [sessions, setSessions] = useState<LiveAiSession[]>([])
  const [selectedCallId, setSelectedCallId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const hasVisibleDataRef = useRef(false)

  const loadSessions = useCallback(async (options: { silent?: boolean } = {}) => {
    const silent = Boolean(options.silent || hasVisibleDataRef.current)
    if (!silent) setLoading(true)
    setError('')
    try {
      const result = await liveAiAPI.listSessions({ silent })
      setSessions(result)
      hasVisibleDataRef.current = true
      setSelectedCallId(current => current ?? result[0]?.callId ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Live AI sessions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSessions()
    const timer = window.setInterval(() => {
      void loadSessions({ silent: true })
    }, 8000)
    return () => window.clearInterval(timer)
  }, [loadSessions])

  return (
    <div className="ptdt-page ptdt-pro-page">
      <div className="ptdt-page-header ptdt-pro-hero">
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

      <div className="ptdt-pro-kpis" style={{ marginBottom: 22 }}>
        <div className="ptdt-pro-kpi">
          <div className="ptdt-pro-kpi-label">Active Sessions</div>
          <div className="ptdt-pro-kpi-value">{sessions.length}</div>
          <div className="ptdt-pro-kpi-note">Live AI attached calls</div>
        </div>
        <div className="ptdt-pro-kpi">
          <div className="ptdt-pro-kpi-label">Live Status</div>
          <div className="ptdt-pro-kpi-value" style={{ fontSize: '1.6rem' }}>{sessions.some(session => session.status === 'LIVE') ? 'Monitoring' : 'Idle'}</div>
          <div className="ptdt-pro-kpi-note">Realtime intelligence loop</div>
        </div>
        <div className="ptdt-pro-kpi">
          <div className="ptdt-pro-kpi-label">Last Update</div>
          <div className="ptdt-pro-kpi-value" style={{ fontSize: '1.45rem' }}>
            {sessions[0]?.updatedAt ? new Date(sessions[0].updatedAt).toLocaleTimeString() : '—'}
          </div>
          <div className="ptdt-pro-kpi-note">Latest session heartbeat</div>
        </div>
      </div>

      <div className="ptdt-pro-grid sidebar live-ai-page-grid">
        <aside className="glass-hi" style={{ borderRadius: 24, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Radio size={18} color="var(--pink)" />
            <h2 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: 21 }}>Active Sessions</h2>
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
