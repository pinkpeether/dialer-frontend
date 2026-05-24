type Props = {
  dialingRatio?: number
  readyAgents?: number
  activeCalls?: number
}

export default function PredictiveGuardrailPanel({ dialingRatio = 1, readyAgents = 0, activeCalls = 0 }: Props) {
  const target = readyAgents * dialingRatio
  const hardCap = Math.min(readyAgents * 3, 25)
  const availableSlots = Math.max(0, Math.min(target - activeCalls, hardCap))

  return (
    <div className="glass lift" style={{ padding: 20, display: 'grid', gap: 12, marginBottom: 16 }}>
      <div className="display" style={{ fontWeight: 900, fontSize: 16, color: 'var(--text)' }}>
        Predictive Beta Guardrails
      </div>
      <div style={{ color: 'var(--text-3)', fontSize: 12.5, lineHeight: 1.55 }}>
        Conservative predictive mode never exceeds ready agents × dialing ratio,
        hard capped at ready agents × 3 and max 25 calls per scheduler tick.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
        <Metric label="Ready Agents" value={readyAgents} />
        <Metric label="Ratio" value={dialingRatio} />
        <Metric label="Active Calls" value={activeCalls} />
        <Metric label="Available Slots" value={availableSlots} />
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 12, background: 'var(--bg-glass)' }}>
      <div className="mono" style={{ color: 'var(--text-3)', fontSize: 10.5, letterSpacing: 0.7, fontWeight: 800 }}>{label}</div>
      <div style={{ fontWeight: 900, fontSize: 20, color: 'var(--text)', marginTop: 3 }}>{value}</div>
    </div>
  )
}
