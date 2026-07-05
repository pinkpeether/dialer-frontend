import { useEffect, useState } from 'react'
import { ActivitySquare } from 'lucide-react'
import { securityAdminProAPI, type SecurityPolicy } from '../api/securityAdminPro.api'

type DuplicateAgent = {
  agent?: { id?: number; name?: string; email?: string }
  activeSessionCount?: number
}

type AuditData = {
  activeSessionCount?: number
  duplicateAgentCount?: number
  duplicateAgents?: DuplicateAgent[]
}

type Props = {
  policy: SecurityPolicy | null
  onPolicyUpdated: (policy: SecurityPolicy) => void
}

export default function SessionSecurityPanel({ policy, onPolicyUpdated }: Props) {
  const [audit, setAudit] = useState<AuditData | null>(null)
  const [mode, setMode] = useState<SecurityPolicy['singleSessionMode']>('ADVISORY')
  const [busy, setBusy] = useState(false)

  const loadAudit = async () => {
    const data = await securityAdminProAPI.singleSessionAudit()
    setAudit(data)
  }

  useEffect(() => {
    if (policy?.singleSessionMode) setMode(policy.singleSessionMode)
    void loadAudit()
  }, [policy?.singleSessionMode])

  const saveMode = async () => {
    const updated = await securityAdminProAPI.updatePolicy({ singleSessionMode: mode })
    onPolicyUpdated(updated)
  }

  const disconnectStale = async () => {
    setBusy(true)
    try {
      await securityAdminProAPI.disconnectStaleSessions()
      await loadAudit()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="glass" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 21, lineHeight: 1.15 }}>Single-Session Management</h2>
          <p style={{ margin: '6px 0 0', color: 'var(--text-3)', lineHeight: 1.6 }}>
            Detect duplicate live sessions and disconnect stale sessions safely.
          </p>
        </div>
        <button type="button" className="ptdt-action-btn" onClick={() => void loadAudit()}>
          Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <MiniMetric label="Active Sessions" value={audit?.activeSessionCount ?? 0} />
        <MiniMetric label="Duplicate Agents" value={audit?.duplicateAgentCount ?? 0} />
        <div style={{ border: '1px solid var(--border)', borderRadius: 16, background: 'var(--bg-glass)', padding: 14 }}>
          <div style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 8 }}>Policy Mode</div>
          <select
            value={mode}
            onChange={event => setMode(event.target.value as SecurityPolicy['singleSessionMode'])}
            style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', padding: '10px 12px' }}
          >
            <option value="OFF">OFF</option>
            <option value="ADVISORY">ADVISORY</option>
            <option value="STRICT">STRICT</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
        <button type="button" className="btn-brand" onClick={() => void saveMode()}>Save Session Policy</button>
        <button type="button" className="ptdt-action-btn" onClick={() => void disconnectStale()} disabled={busy}>
          {busy ? 'Disconnecting...' : 'Disconnect Stale Sessions'}
        </button>
      </div>

      <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
        {(audit?.duplicateAgents || []).length === 0 ? (
          <div style={{ color: 'var(--text-3)' }}>No duplicate live sessions detected.</div>
        ) : (
          (audit?.duplicateAgents || []).map(item => (
            <div key={item.agent?.id || item.agent?.email} style={{ borderRadius: 14, border: '1px solid rgba(240,185,11,0.24)', background: 'rgba(240,185,11,0.10)', padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800 }}>
                <ActivitySquare size={15} />
                {item.agent?.name || item.agent?.email || 'Unknown agent'}
              </div>
              <div style={{ marginTop: 6, color: 'var(--text-3)' }}>
                {item.activeSessionCount || 0} active sessions detected.
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 16, background: 'var(--bg-glass)', padding: 14 }}>
      <div style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 8 }}>{label}</div>
      <div className="mono" style={{ fontSize: 24, fontWeight: 950 }}>{value}</div>
    </div>
  )
}
