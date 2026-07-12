import React from 'react'
import type { KeyboardShortcutConfig } from '../api/uiUxPro.api'

interface Props {
  shortcuts: KeyboardShortcutConfig[]
  enabled: boolean
  saving?: boolean
  onToggleEnabled?: (enabled: boolean) => void
  onToggleShortcut: (action: KeyboardShortcutConfig['action']) => void
}

export default function KeyboardShortcutsPanel({ shortcuts, enabled, saving = false, onToggleEnabled, onToggleShortcut }: Props) {
  return (
    <section style={{ border: '1px solid rgba(148, 163, 184, 0.25)', borderRadius: 18, padding: 16, background: 'rgba(15, 23, 42, 0.88)', color: '#f8fafc' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Keyboard Shortcuts</h2>
          <p style={{ margin: '6px 0 0', color: '#cbd5e1' }}>Fast call-floor controls for mute, hold, hangup, dialer, and disposition saving.</p>
        </div>
        {onToggleEnabled && (
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => onToggleEnabled(!enabled)}
            disabled={saving}
            style={{ ...buttonStyle, color: enabled ? '#00e5a0' : '#cbd5e1', borderColor: enabled ? 'rgba(0,229,160,.46)' : 'rgba(148,163,184,.28)' }}
          >
            {enabled ? 'Shortcuts On' : 'Shortcuts Off'}
          </button>
        )}
      </div>

      {!enabled && <div style={{ marginBottom: 12, color: '#fbbf24', fontWeight: 700 }}>Shortcuts are currently disabled in preferences.</div>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
          <thead><tr style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase' }}><th style={thStyle}>Action</th><th style={thStyle}>Shortcut</th><th style={thStyle}>Scope</th><th style={thStyle}>Status</th><th style={thStyle}>Toggle</th></tr></thead>
          <tbody>
            {shortcuts.map(shortcut => (
              <tr key={shortcut.action} style={{ borderTop: '1px solid rgba(148, 163, 184, 0.16)' }}>
                <td style={tdStyle}>{shortcut.label}</td>
                <td style={tdStyle}><code style={{ background: 'rgba(15,23,42,.9)', border: '1px solid rgba(148,163,184,.25)', padding: '5px 8px', borderRadius: 8 }}>{shortcut.shortcut}</code></td>
                <td style={tdStyle}>{shortcut.scope}</td>
                <td style={tdStyle}>{shortcut.enabled ? 'Enabled' : 'Disabled'}</td>
                <td style={tdStyle}><button type="button" onClick={() => onToggleShortcut(shortcut.action)} style={buttonStyle}>{shortcut.enabled ? 'Disable' : 'Enable'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

const thStyle: React.CSSProperties = { textAlign: 'left', padding: '10px 8px' }
const tdStyle: React.CSSProperties = { padding: '12px 8px', color: '#f8fafc', verticalAlign: 'middle' }
const buttonStyle: React.CSSProperties = { border: '1px solid rgba(148,163,184,.28)', background: 'rgba(30,41,59,.86)', color: '#f8fafc', borderRadius: 10, padding: '8px 10px', cursor: 'pointer', fontWeight: 700 }
