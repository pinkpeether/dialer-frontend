const rows = [
  {
    feature: 'Linux build / AppImage / deb',
    pilotStatus: 'Optional',
    notes: 'Not required unless a Linux client appears. Keep as optional post-pilot task.',
  },
  {
    feature: 'macOS code signing / notarization',
    pilotStatus: 'Optional for hand deployment',
    notes: 'Needed when distributing broadly outside direct client installation.',
  },
  {
    feature: 'Windows code signing certificate',
    pilotStatus: 'Optional for hand deployment',
    notes: 'Needed to reduce SmartScreen warnings at scale.',
  },
  {
    feature: 'Electron auto-update',
    pilotStatus: 'Deferred',
    notes: 'Enable only after stable signed releases exist. Avoid auto-updating unsigned pilot builds.',
  },
  {
    feature: 'Android browser SIP calling',
    pilotStatus: 'Blocked by PBX WSS',
    notes: 'Requires public FreePBX/Asterisk WSS endpoint with trusted SSL certificate.',
  },
]

export default function AutoUpdateReadinessPanel() {
  return (
    <div className="glass" style={{ padding: 18 }}>
      <h2 style={{ marginTop: 0 }}>Auto-update / Code Signing / Platform Readiness</h2>
      <p style={{ margin: '8px 0 16px', color: 'var(--text-3)', lineHeight: 1.6 }}>
        This panel separates pilot-ready items from scale/distribution items so the current client demo can stay low-risk.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead>
            <tr style={{ background: 'var(--bg-glass)' }}>
              {['Feature', 'Pilot status', 'Notes'].map(header => (
                <th key={header} style={{ textAlign: 'left', padding: '12px 14px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.feature} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '13px 14px', fontWeight: 800 }}>{row.feature}</td>
                <td style={{ padding: '13px 14px', color: 'var(--text-2)' }}>{row.pilotStatus}</td>
                <td style={{ padding: '13px 14px', color: 'var(--text-3)', lineHeight: 1.6 }}>{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
