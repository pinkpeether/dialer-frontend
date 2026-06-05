type ChecklistGroup = {
  group: string
  items: string[]
}

type Props = {
  checklist: {
    title: string
    generatedAt: string
    checklist: ChecklistGroup[]
  } | null
}

export default function PbxVpsChecklistPanel({ checklist }: Props) {
  if (!checklist) {
    return <div className="ptdt-card" style={{ padding: 22, color: 'var(--text-3)' }}>Checklist is loading...</div>
  }

  return (
    <div className="glass" style={{ padding: 18 }}>
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>{checklist.title}</h2>
        <p style={{ margin: '8px 0 0', color: 'var(--text-3)' }}>Generated: {new Date(checklist.generatedAt).toLocaleString()}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        {checklist.checklist.map(group => (
          <div key={group.group} style={{ border: '1px solid var(--border)', borderRadius: 16, background: 'var(--bg-glass)', padding: 16 }}>
            <h3 style={{ marginTop: 0, marginBottom: 10 }}>{group.group}</h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 10 }}>
              {group.items.map(item => (
                <li key={item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: 'var(--text-2)', lineHeight: 1.6 }}>
                  <span style={{ marginTop: 8, width: 8, height: 8, borderRadius: 999, background: 'var(--pink)', flexShrink: 0 }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
