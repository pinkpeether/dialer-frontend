import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { securityAdminProAPI, type SecurityPolicy } from '../api/securityAdminPro.api'

type Props = {
  policy: SecurityPolicy | null
  onPolicyUpdated: (policy: SecurityPolicy) => void
}

export default function IpWhitelistPanel({ policy, onPolicyUpdated }: Props) {
  const [enabled, setEnabled] = useState(false)
  const [allowedIps, setAllowedIps] = useState('')
  const [testIp, setTestIp] = useState('')
  const [testResult, setTestResult] = useState<{ ip: string; allowed: boolean } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!policy) return
    setEnabled(Boolean(policy.ipWhitelistEnabled))
    setAllowedIps((policy.allowedIps || []).join('\n'))
  }, [policy])

  const save = async () => {
    setSaving(true)
    try {
      const updated = await securityAdminProAPI.updatePolicy({
        ipWhitelistEnabled: enabled,
        allowedIps: allowedIps.split('\n').map(item => item.trim()).filter(Boolean),
      })
      onPolicyUpdated(updated)
    } finally {
      setSaving(false)
    }
  }

  const checkIp = async () => {
    const result = await securityAdminProAPI.ipCheck(testIp)
    setTestResult(result)
  }

  return (
    <div className="glass" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 21, lineHeight: 1.15 }}>Admin IP Whitelist</h2>
          <p style={{ margin: '6px 0 0', color: 'var(--text-3)', lineHeight: 1.6 }}>
            Pilot-safe admin IP policy. Supports exact IP and simple prefix wildcard like `192.168.0.*`.
          </p>
        </div>
        <label className="ptdt-chip" style={{ gap: 8 }}>
          <input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} />
          Enabled
        </label>
      </div>

      <textarea
        value={allowedIps}
        onChange={event => setAllowedIps(event.target.value)}
        placeholder={'203.0.113.10\n192.168.0.*'}
        style={{
          width: '100%',
          minHeight: 124,
          borderRadius: 16,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--text)',
          padding: 14,
          resize: 'vertical',
        }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, marginTop: 12 }}>
        <input
          value={testIp}
          onChange={event => setTestIp(event.target.value)}
          placeholder="Test IP address"
          style={{
            minWidth: 0,
            borderRadius: 14,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
            padding: '11px 12px',
          }}
        />
        <button type="button" className="ptdt-action-btn" onClick={() => void checkIp()}>
          Test IP
        </button>
        <button type="button" className="btn-brand" onClick={() => void save()} disabled={saving}>
          {saving ? 'Saving...' : 'Save Policy'}
        </button>
      </div>

      {testResult && (
        <div
          style={{
            marginTop: 12,
            borderRadius: 14,
            border: `1px solid ${testResult.allowed ? 'rgba(0,167,71,0.28)' : 'rgba(239,68,68,0.24)'}`,
            background: testResult.allowed ? 'rgba(0,167,71,0.10)' : 'rgba(239,68,68,0.10)',
            color: testResult.allowed ? 'var(--green-2)' : '#ef4444',
            padding: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 700,
          }}
        >
          <ShieldCheck size={15} />
          <span>
            <strong>{testResult.ip}</strong> is {testResult.allowed ? 'allowed' : 'blocked'} by current policy.
          </span>
        </div>
      )}
    </div>
  )
}
