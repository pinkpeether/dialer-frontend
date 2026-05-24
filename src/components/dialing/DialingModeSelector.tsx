type Props = {
  value: string
  onChange: (value: string) => void
}

const MODES = [
  { value: 'MANUAL', label: 'Manual', help: 'Agent selects and dials manually.' },
  { value: 'PREVIEW', label: 'Preview', help: 'Agent reviews next contact before calling.' },
  { value: 'PROGRESSIVE', label: 'Progressive', help: 'One call per ready agent.' },
  { value: 'PREDICTIVE', label: 'Predictive Beta', help: 'Conservative multi-call pacing with guardrails.' },
]

export default function DialingModeSelector({ value, onChange }: Props) {
  const selected = MODES.find(mode => mode.value === value) || MODES[2]

  return (
    <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
      <label
        className="mono"
        style={{
          color: 'var(--text-3)',
          fontSize: 10.5,
          fontWeight: 900,
          letterSpacing: 1.1,
          textTransform: 'uppercase',
        }}
      >
        Dialing Mode
      </label>
      <select
        value={value || 'PROGRESSIVE'}
        onChange={event => onChange(event.target.value)}
        style={{
          width: '100%',
          padding: '11px 14px',
          background: 'var(--bg-glass-hi)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text)',
          fontSize: 13,
          outline: 'none',
          backdropFilter: 'blur(8px)',
        }}
      >
        {MODES.map(mode => (
          <option key={mode.value} value={mode.value}>
            {mode.label}
          </option>
        ))}
      </select>
      <div style={{ color: 'var(--text-3)', fontSize: 11.5, lineHeight: 1.45 }}>
        {selected.help}
      </div>
    </div>
  )
}
