import { useEffect, useState } from 'react'
import { LockKeyhole, RefreshCw } from 'lucide-react'
import SecurityOverviewPanel from '../components/SecurityOverviewPanel'
import IpWhitelistPanel from '../components/IpWhitelistPanel'
import SessionSecurityPanel from '../components/SessionSecurityPanel'
import BillingAdminPanel from '../components/BillingAdminPanel'
import BackupRestorePanel from '../components/BackupRestorePanel'
import { securityAdminProAPI, type SecurityChecklistItem, type SecurityPolicy } from '../api/securityAdminPro.api'

type OverviewData = Record<string, unknown>
type BillingData = Record<string, unknown>

export default function SecurityAdminPro() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [checklist, setChecklist] = useState<SecurityChecklistItem[]>([])
  const [policy, setPolicy] = useState<SecurityPolicy | null>(null)
  const [billing, setBilling] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [overviewData, checklistData, policyData, billingData] = await Promise.all([
        securityAdminProAPI.overview(),
        securityAdminProAPI.checklist(),
        securityAdminProAPI.getPolicy(),
        securityAdminProAPI.billing(),
      ])
      setOverview(overviewData)
      setChecklist(checklistData)
      setPolicy(policyData)
      setBilling(billingData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Security Admin Pro')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <div className="ptdt-page ptdt-pro-page">
      <div className="ptdt-page-header ptdt-pro-hero">
        <div>
          <div className="eyebrow pink" style={{ marginBottom: 12 }}>
            <LockKeyhole size={12} /> Security Hardening
          </div>
          <h1 className="ptdt-page-title">
            Security & <span className="gradient-brand-text">Admin Pro</span>
          </h1>
          <p className="ptdt-page-desc">
            Rate limits, Helmet/CORS readiness, admin IP whitelist, single-session guardrails, billing placeholders, and backup/restore preview.
          </p>
        </div>
        <button type="button" className="ptdt-action-btn" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} /> {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="ptdt-card" style={{ padding: 14, marginBottom: 16, color: '#ef4444', borderColor: 'rgba(239,68,68,0.24)' }}>
          {error}
        </div>
      )}

      {loading && !overview ? (
        <div className="ptdt-card" style={{ padding: 22, color: 'var(--text-3)' }}>
          Loading Security Admin Pro...
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          <SecurityOverviewPanel overview={overview as never} checklist={checklist} />
          <IpWhitelistPanel policy={policy} onPolicyUpdated={setPolicy} />
          <SessionSecurityPanel policy={policy} onPolicyUpdated={setPolicy} />
          <BillingAdminPanel billing={billing as never} />
          <BackupRestorePanel policy={policy} onPolicyUpdated={setPolicy} />
        </div>
      )}
    </div>
  )
}
