import { useState } from 'react'
import { Brain, Search } from 'lucide-react'
import { callIntelligenceAPI } from '../api/callIntelligence.api'

export default function CallIntelligence() {
  const [callId, setCallId] = useState('')
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    try {
      setData(await callIntelligenceAPI.getByCall(callId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load call intelligence')
    }
  }

  const queueTranscript = async () => {
    setError('')
    try {
      setData(await callIntelligenceAPI.createTranscript(callId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to queue transcription')
    }
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1200, margin: '0 auto' }}>
      <div className="eyebrow pink"><Brain size={12} /> Phase 4</div>
      <h1 className="display" style={{ fontSize: 38, fontWeight: 900 }}>Call <span className="gradient-brand-text">Intelligence</span></h1>
      <p style={{ color: 'var(--text-3)' }}>AI/transcription scaffold. Enable provider/migration before production use.</p>

      <div className="glass" style={{ padding: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input value={callId} onChange={e => setCallId(e.target.value)} placeholder="Call ID" />
        <button onClick={() => void load()}><Search size={14} /> Load</button>
        <button className="btn-brand" onClick={() => void queueTranscript()} disabled={!callId}>Queue Transcript</button>
      </div>

      {error && <div style={{ color: '#ef4444', marginTop: 16 }}>{error}</div>}
      <pre className="glass" style={{ marginTop: 18, padding: 16, maxHeight: 520, overflow: 'auto' }}>
        {data ? JSON.stringify(data, null, 2) : 'No call loaded.'}
      </pre>
    </div>
  )
}
