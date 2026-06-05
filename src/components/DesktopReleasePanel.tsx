type CommandItem = {
  title: string
  command: string
}

type Props = {
  commands: {
    generatedAt: string
    commands: CommandItem[]
  } | null
}

const copyCommand = async (command: string) => {
  try {
    await navigator.clipboard.writeText(command)
  } catch {
    // no-op
  }
}

export default function DesktopReleasePanel({ commands }: Props) {
  if (!commands) {
    return <div className="ptdt-card" style={{ padding: 22, color: 'var(--text-3)' }}>Smoke commands are loading...</div>
  }

  return (
    <div className="glass" style={{ padding: 18 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Desktop / Platform Smoke Commands</h2>
        <p style={{ margin: '8px 0 0', color: 'var(--text-3)' }}>Generated: {new Date(commands.generatedAt).toLocaleString()}</p>
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        {commands.commands.map(item => (
          <div key={item.title} style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', background: '#0f172a', color: '#f8fafc', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>{item.title}</h3>
              <button type="button" className="ptdt-action-btn" onClick={() => void copyCommand(item.command)}>Copy</button>
            </div>
            <pre style={{ margin: '12px 0 0', whiteSpace: 'pre-wrap', overflowX: 'auto', wordBreak: 'break-word', color: '#cbd5e1', fontSize: 12, lineHeight: 1.7 }}>{item.command}</pre>
          </div>
        ))}
      </div>
    </div>
  )
}
