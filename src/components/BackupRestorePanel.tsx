import { useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { securityAdminProAPI, type SecurityPolicy } from '../api/securityAdminPro.api'

type Props = {
  policy: SecurityPolicy | null
  onPolicyUpdated: (policy: SecurityPolicy) => void
}

export default function BackupRestorePanel({ policy, onPolicyUpdated }: Props) {
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null)
  const [busy, setBusy] = useState(false)

  const downloadBackup = async () => {
    setBusy(true)
    try {
      const blob = await securityAdminProAPI.exportBackup()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `ptdt-dialer-backup-${Date.now()}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } finally {
      setBusy(false)
    }
  }

  const handleFile = async (file?: File) => {
    if (!file) return
    const text = await file.text()
    const payload = JSON.parse(text)
    const data = await securityAdminProAPI.restorePreview(payload)
    setPreview(data)
  }

  const updateBackupPolicy = async (patch: Partial<SecurityPolicy>) => {
    const updated = await securityAdminProAPI.updatePolicy(patch)
    onPolicyUpdated(updated)
  }

  return (
    <div className="glass" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 21, lineHeight: 1.15 }}>Backup & Restore Guardrails</h2>
          <p style={{ margin: '6px 0 0', color: 'var(--text-3)', lineHeight: 1.6 }}>
            Export redacted pilot backup and validate restore files without writing to DB.
          </p>
        </div>
        <button type="button" className="btn-brand" onClick={() => void downloadBackup()} disabled={busy || !policy?.backupExportEnabled}>
          <Download size={14} /> {busy ? 'Exporting...' : 'Download Backup JSON'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <label className="ptdt-chip" style={{ justifyContent: 'space-between', padding: '14px 16px' }}>
          <span>Backup export enabled</span>
          <input type="checkbox" checked={Boolean(policy?.backupExportEnabled)} onChange={event => void updateBackupPolicy({ backupExportEnabled: event.target.checked })} />
        </label>
        <label className="ptdt-chip" style={{ justifyContent: 'space-between', padding: '14px 16px' }}>
          <span>Restore enabled</span>
          <input type="checkbox" checked={Boolean(policy?.restoreEnabled)} onChange={event => void updateBackupPolicy({ restoreEnabled: event.target.checked })} />
        </label>
        <label style={{ border: '1px solid var(--border)', borderRadius: 16, background: 'var(--bg-glass)', padding: 14 }}>
          <div style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 8 }}>Audit retention days</div>
          <input
            type="number"
            value={policy?.auditRetentionDays || 180}
            onChange={event => void updateBackupPolicy({ auditRetentionDays: Number(event.target.value) })}
            style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', padding: '10px 12px' }}
          />
        </label>
      </div>

      <div style={{ marginTop: 14, border: '1px dashed var(--border)', borderRadius: 16, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, marginBottom: 8 }}>
          <Upload size={15} /> Restore Preview
        </div>
        <input type="file" accept="application/json,.json" onChange={event => void handleFile(event.target.files?.[0]).catch(error => setPreview({ valid: false, message: error.message }))} />
        {preview && (
          <pre style={{ marginTop: 12, maxHeight: 280, overflow: 'auto', borderRadius: 14, background: '#0f172a', color: '#e2e8f0', padding: 14, fontSize: 12 }}>
            {JSON.stringify(preview, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}
