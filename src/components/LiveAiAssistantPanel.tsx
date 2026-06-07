import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { liveAiAPI } from '../api/liveAi.api'
import type { LiveAiSession, SmartScriptPrompt } from '../api/liveAi.api'

type Props = {
  callId?: number | null
  compact?: boolean
}

const panel: CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 24,
  padding: 18,
  background: 'var(--bg-glass-hi)',
  boxShadow: 'var(--shadow-md)',
}

const darkPanel: CSSProperties = {
  ...panel,
  background: 'linear-gradient(180deg, rgba(17, 11, 24, 0.92), rgba(27, 23, 35, 0.92))',
  color: 'var(--text)',
  border: '1px solid rgba(236, 72, 153, 0.24)',
}

const buttonBase: CSSProperties = {
  border: 0,
  borderRadius: 14,
  padding: '11px 14px',
  fontWeight: 800,
  cursor: 'pointer',
}

const inputStyle: CSSProperties = {
  width: '100%',
  borderRadius: 14,
  border: '1px solid var(--border)',
  padding: '12px 14px',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  background: 'var(--bg-glass-hi)',
  color: 'var(--text)',
}

const sentimentColor = (sentiment?: string) => {
  if (sentiment === 'POSITIVE') return '#16a34a'
  if (sentiment === 'NEGATIVE') return '#f59e0b'
  if (sentiment === 'CRITICAL') return '#dc2626'
  return '#64748b'
}

const fmt = (value?: string | null) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

export default function LiveAiAssistantPanel({ callId, compact = false }: Props) {
  const [activeCallId, setActiveCallId] = useState<number | null>(callId || null)
  const [manualCallId, setManualCallId] = useState(callId ? String(callId) : '')
  const [session, setSession] = useState<LiveAiSession | null>(null)
  const [script, setScript] = useState<SmartScriptPrompt | null>(null)
  const [chunkText, setChunkText] = useState('')
  const [speaker, setSpeaker] = useState('customer')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const currentCallId = useMemo(() => activeCallId || Number(manualCallId) || null, [activeCallId, manualCallId])

  const loadSession = useCallback(async (id = currentCallId) => {
    if (!id) return
    try {
      const result = await liveAiAPI.getSession(id)
      setSession(result)
    } catch {
      // A session may not exist yet; this is fine before Start Live AI.
    }
  }, [currentCallId])

  const loadScript = useCallback(async (id = currentCallId) => {
    if (!id) return
    try {
      const result = await liveAiAPI.getSmartScript(id)
      setScript(result)
    } catch {
      setScript(null)
    }
  }, [currentCallId])

  useEffect(() => {
    if (callId) {
      setActiveCallId(callId)
      setManualCallId(String(callId))
    }
  }, [callId])

  useEffect(() => {
    if (!currentCallId || session?.status !== 'LIVE') return undefined
    const timer = window.setInterval(() => loadSession(currentCallId), 4000)
    return () => window.clearInterval(timer)
  }, [currentCallId, loadSession, session?.status])

  const run = async (task: () => Promise<void>, okMessage: string) => {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      await task()
      setMessage(okMessage)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Live AI action failed')
    } finally {
      setLoading(false)
    }
  }

  const start = () => run(async () => {
    if (!currentCallId) throw new Error('Enter a call ID first')
    setActiveCallId(currentCallId)
    const result = await liveAiAPI.startSession(currentCallId)
    setSession(result)
    await loadScript(currentCallId)
  }, 'Live AI session started')

  const sendChunk = () => run(async () => {
    if (!currentCallId) throw new Error('Enter a call ID first')
    if (!chunkText.trim()) throw new Error('Enter live transcript text first')
    const result = await liveAiAPI.sendChunk(currentCallId, {
      speaker,
      text: chunkText.trim(),
      source: 'manual-live-console',
    })
    setSession(result)
    setChunkText('')
    await loadScript(currentCallId)
  }, 'Live transcript chunk analyzed')

  const applyDisposition = () => run(async () => {
    if (!currentCallId) throw new Error('Enter a call ID first')
    await liveAiAPI.applyAutoDisposition(currentCallId)
    await loadSession(currentCallId)
  }, 'Auto disposition applied')

  const createFollowUp = () => run(async () => {
    if (!currentCallId) throw new Error('Enter a call ID first')
    await liveAiAPI.createFollowUp(currentCallId, {
      minutesFromNow: session?.followUpSuggestion?.suggestedMinutesFromNow || 120,
      notes: session?.followUpSuggestion?.reason || 'Live AI suggested follow-up.',
    })
    await loadSession(currentCallId)
  }, 'Follow-up callback created')

  const stop = () => run(async () => {
    if (!currentCallId) throw new Error('Enter a call ID first')
    const result = await liveAiAPI.stopSession(currentCallId)
    setSession(result)
  }, 'Live AI session stopped')

  const refresh = () => run(async () => {
    if (!currentCallId) throw new Error('Enter a call ID first')
    await loadSession(currentCallId)
    await loadScript(currentCallId)
  }, 'Live AI refreshed')

  return (
    <section style={compact ? darkPanel : panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, letterSpacing: 3, textTransform: 'uppercase', fontSize: 12, color: 'var(--pink)', fontWeight: 900 }}>
            Live AI Assistant
          </p>
          <h2 style={{ margin: '8px 0 6px', fontSize: compact ? 22 : 30 }}>Realtime Call Intelligence</h2>
          <p style={{ margin: 0, color: 'var(--text-3)', lineHeight: 1.6 }}>
            Live transcript chunks, answer detection, sentiment alerts, smart script hints, auto disposition, and callback suggestions.
          </p>
        </div>
        <div style={{ minWidth: 170 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 900, marginBottom: 6 }}>CALL ID</label>
          <input
            style={inputStyle}
            value={manualCallId}
            onChange={event => {
              setManualCallId(event.target.value)
              setActiveCallId(Number(event.target.value) || null)
            }}
            placeholder="e.g. 79"
            inputMode="numeric"
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
        <button style={{ ...buttonBase, background: 'linear-gradient(135deg, var(--pink), var(--purple))', color: '#fff' }} onClick={start} disabled={loading}>Start Live AI</button>
        <button style={{ ...buttonBase, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }} onClick={refresh} disabled={loading}>Refresh</button>
        <button style={{ ...buttonBase, background: 'var(--bg-2)', color: 'var(--text)', border: '1px solid var(--border)' }} onClick={stop} disabled={loading}>Stop</button>
      </div>

      {(message || error) && (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 14, background: error ? 'rgba(239,68,68,0.08)' : 'rgba(0,167,71,0.10)', color: error ? 'var(--danger)' : 'var(--green-2)', fontWeight: 800 }}>
          {error || message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 18 }}>
        <div style={{ padding: 14, borderRadius: 18, background: 'var(--bg-2)' }}>
          <div style={{ fontSize: 11, letterSpacing: 2, fontWeight: 900, color: 'var(--text-3)' }}>STATUS</div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>{session?.status || 'IDLE'}</div>
        </div>
        <div style={{ padding: 14, borderRadius: 18, background: 'var(--bg-2)' }}>
          <div style={{ fontSize: 11, letterSpacing: 2, fontWeight: 900, color: 'var(--text-3)' }}>ANSWER</div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>{session?.answerDetection || 'UNKNOWN'}</div>
        </div>
        <div style={{ padding: 14, borderRadius: 18, background: 'var(--bg-2)' }}>
          <div style={{ fontSize: 11, letterSpacing: 2, fontWeight: 900, color: 'var(--text-3)' }}>SENTIMENT</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: sentimentColor(session?.sentiment) }}>
            {session?.sentiment || 'NEUTRAL'} {session ? `(${session.sentimentScore})` : ''}
          </div>
        </div>
        <div style={{ padding: 14, borderRadius: 18, background: 'var(--bg-2)' }}>
          <div style={{ fontSize: 11, letterSpacing: 2, fontWeight: 900, color: 'var(--text-3)' }}>DISPOSITION</div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>{session?.autoDisposition || '—'}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 0.85fr)', gap: 14, marginTop: 16 }} className="live-ai-grid">
        <div style={{ minWidth: 0 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 900, marginBottom: 8 }}>LIVE TRANSCRIPT CHUNK</label>
          <textarea
            style={{ ...inputStyle, minHeight: 116, resize: 'vertical', lineHeight: 1.6 }}
            value={chunkText}
            onChange={event => setChunkText(event.target.value)}
            placeholder="Paste or stream live transcript text here..."
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <select style={{ ...inputStyle, maxWidth: 190 }} value={speaker} onChange={event => setSpeaker(event.target.value)}>
              <option value="customer">Customer</option>
              <option value="agent">Agent</option>
              <option value="system">System</option>
            </select>
            <button style={{ ...buttonBase, background: '#10b981', color: '#fff' }} onClick={sendChunk} disabled={loading}>Analyze Chunk</button>
          </div>

          <div style={{ marginTop: 16, padding: 14, borderRadius: 18, background: 'var(--bg-2)', maxHeight: 260, overflow: 'auto' }}>
            <h3 style={{ margin: '0 0 10px' }}>Transcript</h3>
            {session?.chunks?.length ? session.chunks.slice().reverse().map(chunk => (
              <div key={chunk.id} style={{ borderBottom: '1px solid rgba(148,163,184,0.22)', padding: '10px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <strong>{chunk.speaker}</strong>
                  <span style={{ color: sentimentColor(chunk.sentiment), fontWeight: 900 }}>{chunk.sentiment} {chunk.sentimentScore}</span>
                </div>
                <p style={{ margin: '6px 0 0', lineHeight: 1.6 }}>{chunk.text}</p>
              </div>
            )) : <p style={{ color: 'var(--text-3)' }}>No live transcript chunks yet.</p>}
          </div>
        </div>

        <aside style={{ minWidth: 0, display: 'grid', gap: 12 }}>
          <div style={{ padding: 14, borderRadius: 18, background: 'var(--bg-2)' }}>
            <h3 style={{ margin: '0 0 8px' }}>Smart Script</h3>
            <p style={{ margin: 0, lineHeight: 1.55, color: 'var(--text-2)' }}>
              {script?.baseScript || session?.scriptPrompt || 'Start a Live AI session to load campaign script.'}
            </p>
            <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: 'rgba(251,11,140,0.10)', color: 'var(--pink)', fontWeight: 800, lineHeight: 1.5 }}>
              {session?.recommendedResponse || script?.liveHint || 'Live AI hint will appear here.'}
            </div>
          </div>

          <div style={{ padding: 14, borderRadius: 18, background: 'var(--bg-2)' }}>
            <h3 style={{ margin: '0 0 8px' }}>Follow-up</h3>
            <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.5 }}>
              {session?.followUpSuggestion?.reason || 'No follow-up suggestion yet.'}
            </p>
            {session?.followUpSuggestion?.shouldSchedule && (
              <button style={{ ...buttonBase, marginTop: 12, background: 'linear-gradient(135deg, var(--purple), var(--pink))', color: '#fff' }} onClick={createFollowUp} disabled={loading}>
                Create Callback
              </button>
            )}
          </div>

          <div style={{ padding: 14, borderRadius: 18, background: 'var(--bg-2)' }}>
            <h3 style={{ margin: '0 0 8px' }}>Auto Disposition</h3>
            <p style={{ margin: 0, color: 'var(--text-2)' }}>{session?.autoDisposition || 'No suggestion yet.'}</p>
            <button style={{ ...buttonBase, marginTop: 12, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }} onClick={applyDisposition} disabled={loading || !session?.autoDisposition}>
              Apply Suggestion
            </button>
          </div>

          <div style={{ padding: 14, borderRadius: 18, background: 'var(--bg-2)' }}>
            <h3 style={{ margin: '0 0 8px' }}>Sentiment Alerts</h3>
            {session?.alerts?.length ? session.alerts.slice().reverse().map(alert => (
              <div key={alert.id} style={{ padding: 10, borderRadius: 12, marginBottom: 8, background: alert.severity === 'CRITICAL' ? 'rgba(239,68,68,0.10)' : 'rgba(240,185,11,0.12)', color: alert.severity === 'CRITICAL' ? 'var(--danger)' : 'var(--gold)', fontWeight: 800 }}>
                {alert.message}
              </div>
            )) : <p style={{ margin: 0, color: 'var(--text-3)' }}>No alerts.</p>}
          </div>
        </aside>
      </div>

      <p style={{ margin: '14px 0 0', color: 'var(--text-3)', fontSize: 12 }}>
        Started: {fmt(session?.startedAt)} · Updated: {fmt(session?.updatedAt)}
      </p>

      <style>{`
        @media (max-width: 820px) {
          .live-ai-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
